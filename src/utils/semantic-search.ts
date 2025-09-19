import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { errorHandler } from './error-handler';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface SearchQuery {
  text: string;
  filters?: {
    category?: 'providers' | 'services' | 'medications' | 'conditions' | 'articles' | 'all';
    location?: string;
    specialty?: string;
    availability?: 'today' | 'this_week' | 'this_month' | 'any';
    priceRange?: [number, number];
    rating?: number;
  };
  intent?: 'find_provider' | 'book_appointment' | 'learn_about' | 'get_directions' | 'compare_options';
  context?: {
    userId?: string;
    currentLocation?: [number, number];
    medicalHistory?: string[];
    preferences?: any;
  };
}

export interface SearchResult {
  id: string;
  type: 'provider' | 'service' | 'medication' | 'condition' | 'article' | 'appointment_slot';
  title: string;
  description: string;
  relevanceScore: number;
  semanticScore: number;
  metadata: {
    category?: string;
    specialty?: string;
    location?: string;
    rating?: number;
    price?: number;
    availability?: string;
    distance?: number;
    [key: string]: any;
  };
  highlights: string[];
  relatedTerms: string[];
  actionable: boolean;
  actions?: SearchAction[];
}

export interface SearchAction {
  type: 'book_appointment' | 'call' | 'get_directions' | 'learn_more' | 'compare' | 'save';
  label: string;
  url?: string;
  data?: any;
}

export interface SearchSuggestion {
  text: string;
  type: 'completion' | 'correction' | 'related' | 'trending';
  confidence: number;
  category?: string;
}

class SemanticSearchService {
  private searchIndex: Map<string, any> = new Map();
  private synonyms: Map<string, string[]> = new Map();
  private medicalTerms: Map<string, any> = new Map();
  private userSearchHistory: Map<string, string[]> = new Map();

  constructor() {
    this.initializeSearchData();
  }

  private async initializeSearchData(): Promise<void> {
    try {
      await Promise.all([
        this.loadMedicalTerminology(),
        this.loadSynonyms(),
        this.buildSearchIndex()
      ]);

      logger.info('Semantic search service initialized', 'SEMANTIC_SEARCH');
    } catch (error) {
      errorHandler.handleError(error, 'initializeSearchData');
    }
  }

  private async loadMedicalTerminology(): Promise<void> {
    try {
      // Medical terminology with synonyms and related terms
      const medicalData = {
        'hypertension': {
          synonyms: ['high blood pressure', 'elevated bp', 'htn'],
          category: 'condition',
          icd10: 'I10',
          relatedTerms: ['cardiovascular', 'heart disease', 'stroke risk']
        },
        'diabetes': {
          synonyms: ['diabetes mellitus', 'high blood sugar', 'dm'],
          category: 'condition',
          icd10: 'E11',
          relatedTerms: ['insulin', 'glucose', 'endocrinology']
        },
        'cardiologist': {
          synonyms: ['heart doctor', 'cardiac specialist', 'heart specialist'],
          category: 'specialty',
          relatedTerms: ['cardiology', 'heart', 'cardiovascular']
        },
        'dermatologist': {
          synonyms: ['skin doctor', 'dermatology specialist'],
          category: 'specialty',
          relatedTerms: ['skin', 'dermatology', 'acne', 'rash']
        },
        'chest pain': {
          synonyms: ['cardiac pain', 'heart pain', 'thoracic pain'],
          category: 'symptom',
          urgency: 'high',
          relatedTerms: ['cardiology', 'emergency', 'heart attack']
        },
        'headache': {
          synonyms: ['head pain', 'cephalgia', 'migraine'],
          category: 'symptom',
          urgency: 'medium',
          relatedTerms: ['neurology', 'pain management']
        }
      };

      Object.entries(medicalData).forEach(([term, data]) => {
        this.medicalTerms.set(term.toLowerCase(), data);
        
        // Add synonyms to the map
        data.synonyms.forEach(synonym => {
          this.synonyms.set(synonym.toLowerCase(), [term, ...data.synonyms.filter(s => s !== synonym)]);
        });
      });

      logger.info(`Loaded ${this.medicalTerms.size} medical terms`, 'SEMANTIC_SEARCH');
    } catch (error) {
      logger.error('Failed to load medical terminology', 'SEMANTIC_SEARCH', error);
    }
  }

  private async loadSynonyms(): Promise<void> {
    try {
      // Common healthcare synonyms
      const synonymGroups = [
        ['doctor', 'physician', 'md', 'provider', 'practitioner'],
        ['appointment', 'visit', 'consultation', 'checkup'],
        ['medicine', 'medication', 'drug', 'prescription', 'pill'],
        ['hospital', 'medical center', 'clinic', 'healthcare facility'],
        ['emergency', 'urgent', 'immediate', 'asap', 'stat'],
        ['pain', 'ache', 'discomfort', 'soreness', 'hurt'],
        ['treatment', 'therapy', 'care', 'management'],
        ['test', 'exam', 'screening', 'diagnostic', 'lab work']
      ];

      synonymGroups.forEach(group => {
        group.forEach(word => {
          const synonyms = group.filter(w => w !== word);
          this.synonyms.set(word.toLowerCase(), synonyms);
        });
      });

      logger.info(`Loaded ${this.synonyms.size} synonym mappings`, 'SEMANTIC_SEARCH');
    } catch (error) {
      logger.error('Failed to load synonyms', 'SEMANTIC_SEARCH', error);
    }
  }

  private async buildSearchIndex(): Promise<void> {
    try {
      // Index providers
      const { data: providers } = await supabase
        .from('providers')
        .select('*');

      providers?.forEach(provider => {
        this.searchIndex.set(`provider-${provider.id}`, {
          ...provider,
          searchableText: `${provider.name} ${provider.specialty} ${provider.bio || ''} ${provider.services?.join(' ') || ''}`.toLowerCase(),
          type: 'provider'
        });
      });

      // Index services
      const { data: services } = await supabase
        .from('services')
        .select('*');

      services?.forEach(service => {
        this.searchIndex.set(`service-${service.id}`, {
          ...service,
          searchableText: `${service.name} ${service.description || ''} ${service.category || ''}`.toLowerCase(),
          type: 'service'
        });
      });

      logger.info(`Built search index with ${this.searchIndex.size} items`, 'SEMANTIC_SEARCH');
    } catch (error) {
      logger.error('Failed to build search index', 'SEMANTIC_SEARCH', error);
    }
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    try {
      logger.info('Performing semantic search', 'SEMANTIC_SEARCH', { 
        query: query.text,
        category: query.filters?.category 
      });

      // Analyze query intent
      const intent = this.analyzeIntent(query.text, query.intent);
      
      // Expand query with synonyms and related terms
      const expandedQuery = this.expandQuery(query.text);
      
      // Get base results
      const baseResults = await this.performBaseSearch(expandedQuery, query.filters);
      
      // Apply semantic scoring
      const semanticResults = this.applySemanticScoring(baseResults, expandedQuery, query.context);
      
      // Personalize results
      const personalizedResults = await this.personalizeResults(semanticResults, query.context);
      
      // Add actions based on intent
      const actionableResults = this.addSearchActions(personalizedResults, intent);
      
      // Sort by relevance
      const sortedResults = actionableResults.sort((a, b) => 
        (b.relevanceScore + b.semanticScore) - (a.relevanceScore + a.semanticScore)
      );

      // Store search for learning
      if (query.context?.userId) {
        this.storeSearchHistory(query.context.userId, query.text, sortedResults.length);
      }

      logger.info(`Search completed: ${sortedResults.length} results`, 'SEMANTIC_SEARCH');
      return sortedResults.slice(0, 20); // Limit to top 20 results
    } catch (error) {
      errorHandler.handleError(error, 'search');
      return [];
    }
  }

  private analyzeIntent(queryText: string, explicitIntent?: string): string {
    if (explicitIntent) return explicitIntent;

    const lowerQuery = queryText.toLowerCase();
    
    // Intent patterns
    const intentPatterns = {
      'find_provider': [
        /find (a |an )?doctor/,
        /looking for (a |an )?physician/,
        /need (a |an )?(specialist|cardiologist|dermatologist)/,
        /(doctor|physician|specialist) near me/
      ],
      'book_appointment': [
        /book (an )?appointment/,
        /schedule (a )?visit/,
        /make (an )?appointment/,
        /available (today|tomorrow|this week)/
      ],
      'learn_about': [
        /what is/,
        /tell me about/,
        /information about/,
        /symptoms of/,
        /causes of/,
        /treatment for/
      ],
      'get_directions': [
        /directions to/,
        /how to get to/,
        /location of/,
        /address of/
      ],
      'compare_options': [
        /compare/,
        /best (doctor|hospital|clinic)/,
        /reviews of/,
        /ratings for/
      ]
    };

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      if (patterns.some(pattern => pattern.test(lowerQuery))) {
        return intent;
      }
    }

    return 'find_provider'; // Default intent
  }

  private expandQuery(queryText: string): string[] {
    const words = queryText.toLowerCase().split(/\s+/);
    const expandedTerms = new Set([queryText.toLowerCase()]);

    words.forEach(word => {
      // Add original word
      expandedTerms.add(word);

      // Add synonyms
      const synonyms = this.synonyms.get(word);
      if (synonyms) {
        synonyms.forEach(synonym => expandedTerms.add(synonym));
      }

      // Add medical term variations
      const medicalTerm = this.medicalTerms.get(word);
      if (medicalTerm) {
        medicalTerm.synonyms.forEach((synonym: string) => expandedTerms.add(synonym));
        medicalTerm.relatedTerms.forEach((term: string) => expandedTerms.add(term));
      }

      // Handle partial matches for medical terms
      this.medicalTerms.forEach((data, term) => {
        if (term.includes(word) || word.includes(term)) {
          expandedTerms.add(term);
          data.synonyms.forEach((synonym: string) => expandedTerms.add(synonym));
        }
      });
    });

    return Array.from(expandedTerms);
  }

  private async performBaseSearch(expandedQuery: string[], filters?: SearchQuery['filters']): Promise<any[]> {
    const results: any[] = [];

    // Search through indexed items
    this.searchIndex.forEach((item, key) => {
      const relevanceScore = this.calculateRelevanceScore(item.searchableText, expandedQuery);
      
      if (relevanceScore > 0.1) { // Minimum relevance threshold
        // Apply filters
        if (this.passesFilters(item, filters)) {
          results.push({
            ...item,
            relevanceScore,
            highlights: this.generateHighlights(item.searchableText, expandedQuery)
          });
        }
      }
    });

    // Search database for dynamic content
    if (!filters?.category || filters.category === 'articles' || filters.category === 'all') {
      const articleResults = await this.searchArticles(expandedQuery);
      results.push(...articleResults);
    }

    return results;
  }

  private calculateRelevanceScore(text: string, queryTerms: string[]): number {
    let score = 0;
    const textWords = text.split(/\s+/);
    
    queryTerms.forEach(term => {
      // Exact match
      if (text.includes(term)) {
        score += 1.0;
      }
      
      // Word boundary match
      const wordMatch = textWords.some(word => 
        word.includes(term) || term.includes(word)
      );
      if (wordMatch) {
        score += 0.5;
      }
      
      // Fuzzy match (simplified)
      const fuzzyMatches = textWords.filter(word => 
        this.calculateLevenshteinDistance(word, term) <= 2
      );
      score += fuzzyMatches.length * 0.2;
    });

    return Math.min(score / queryTerms.length, 1.0);
  }

  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private passesFilters(item: any, filters?: SearchQuery['filters']): boolean {
    if (!filters) return true;

    // Category filter
    if (filters.category && filters.category !== 'all') {
      if (item.type !== filters.category.slice(0, -1)) { // Remove 's' from plural
        return false;
      }
    }

    // Specialty filter
    if (filters.specialty && item.specialty) {
      if (!item.specialty.toLowerCase().includes(filters.specialty.toLowerCase())) {
        return false;
      }
    }

    // Rating filter
    if (filters.rating && item.rating) {
      if (item.rating < filters.rating) {
        return false;
      }
    }

    // Price range filter
    if (filters.priceRange && item.price) {
      const [min, max] = filters.priceRange;
      if (item.price < min || item.price > max) {
        return false;
      }
    }

    return true;
  }

  private generateHighlights(text: string, queryTerms: string[]): string[] {
    const highlights: string[] = [];
    const sentences = text.split(/[.!?]+/);

    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      const matchingTerms = queryTerms.filter(term => lowerSentence.includes(term));
      
      if (matchingTerms.length > 0) {
        let highlighted = sentence;
        matchingTerms.forEach(term => {
          const regex = new RegExp(`(${term})`, 'gi');
          highlighted = highlighted.replace(regex, '<mark>$1</mark>');
        });
        highlights.push(highlighted.trim());
      }
    });

    return highlights.slice(0, 3); // Limit to 3 highlights
  }

  private applySemanticScoring(results: any[], queryTerms: string[], context?: SearchQuery['context']): SearchResult[] {
    return results.map(result => {
      let semanticScore = 0;

      // Medical term relevance
      queryTerms.forEach(term => {
        const medicalTerm = this.medicalTerms.get(term);
        if (medicalTerm) {
          // Boost score for matching medical categories
          if (result.type === 'provider' && result.specialty) {
            const specialtyMatch = medicalTerm.relatedTerms.some((relatedTerm: string) =>
              result.specialty.toLowerCase().includes(relatedTerm.toLowerCase())
            );
            if (specialtyMatch) semanticScore += 0.3;
          }

          // Urgency boost
          if (medicalTerm.urgency === 'high') {
            semanticScore += 0.2;
          }
        }
      });

      // Location relevance
      if (context?.currentLocation && result.location) {
        const distance = this.calculateDistance(context.currentLocation, result.coordinates);
        if (distance < 10) semanticScore += 0.2; // Within 10km
        if (distance < 5) semanticScore += 0.1;  // Within 5km
      }

      // User history relevance
      if (context?.userId) {
        const userHistory = this.userSearchHistory.get(context.userId) || [];
        const historyMatch = userHistory.some(pastQuery => 
          queryTerms.some(term => pastQuery.includes(term))
        );
        if (historyMatch) semanticScore += 0.1;
      }

      return {
        id: result.id || `${result.type}-${Date.now()}`,
        type: result.type,
        title: result.name || result.title,
        description: result.bio || result.description || '',
        relevanceScore: result.relevanceScore,
        semanticScore,
        metadata: {
          category: result.category,
          specialty: result.specialty,
          location: result.address,
          rating: result.rating,
          price: result.consultation_fee || result.price,
          availability: result.availability,
          distance: context?.currentLocation && result.coordinates 
            ? this.calculateDistance(context.currentLocation, result.coordinates)
            : undefined
        },
        highlights: result.highlights || [],
        relatedTerms: this.getRelatedTerms(queryTerms),
        actionable: true,
        actions: []
      };
    });
  }

  private calculateDistance(point1: [number, number], point2: [number, number]): number {
    // Simplified distance calculation (Haversine formula would be more accurate)
    const [lat1, lon1] = point1;
    const [lat2, lon2] = point2;
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private getRelatedTerms(queryTerms: string[]): string[] {
    const relatedTerms = new Set<string>();

    queryTerms.forEach(term => {
      const medicalTerm = this.medicalTerms.get(term);
      if (medicalTerm) {
        medicalTerm.relatedTerms.forEach((relatedTerm: string) => {
          relatedTerms.add(relatedTerm);
        });
      }

      const synonyms = this.synonyms.get(term);
      if (synonyms) {
        synonyms.forEach(synonym => relatedTerms.add(synonym));
      }
    });

    return Array.from(relatedTerms).slice(0, 5);
  }

  private async personalizeResults(results: SearchResult[], context?: SearchQuery['context']): Promise<SearchResult[]> {
    if (!context?.userId) return results;

    try {
      // Get user preferences
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', context.userId)
        .single();

      if (preferences) {
        results.forEach(result => {
          // Boost preferred providers
          if (preferences.preferred_providers?.includes(result.id)) {
            result.semanticScore += 0.2;
          }

          // Boost based on past appointments
          if (preferences.appointment_history?.includes(result.id)) {
            result.semanticScore += 0.1;
          }
        });
      }

      return results;
    } catch (error) {
      logger.error('Failed to personalize results', 'SEMANTIC_SEARCH', error);
      return results;
    }
  }

  private addSearchActions(results: SearchResult[], intent: string): SearchResult[] {
    return results.map(result => {
      const actions: SearchAction[] = [];

      switch (intent) {
        case 'find_provider':
          if (result.type === 'provider') {
            actions.push(
              { type: 'book_appointment', label: 'Book Appointment', data: { providerId: result.id } },
              { type: 'call', label: 'Call', data: { phone: result.metadata.phone } },
              { type: 'get_directions', label: 'Get Directions', data: { address: result.metadata.location } }
            );
          }
          break;

        case 'book_appointment':
          actions.push(
            { type: 'book_appointment', label: 'Book Now', data: { providerId: result.id } }
          );
          break;

        case 'learn_about':
          actions.push(
            { type: 'learn_more', label: 'Learn More', url: `/info/${result.id}` }
          );
          break;

        case 'compare_options':
          actions.push(
            { type: 'compare', label: 'Compare', data: { itemId: result.id } },
            { type: 'save', label: 'Save for Later', data: { itemId: result.id } }
          );
          break;
      }

      return { ...result, actions };
    });
  }

  private async searchArticles(queryTerms: string[]): Promise<any[]> {
    try {
      // This would typically search a knowledge base or CMS
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Failed to search articles', 'SEMANTIC_SEARCH', error);
      return [];
    }
  }

  private storeSearchHistory(userId: string, query: string, resultCount: number): void {
    try {
      const history = this.userSearchHistory.get(userId) || [];
      history.unshift(query.toLowerCase());
      
      // Keep only last 50 searches
      if (history.length > 50) {
        history.splice(50);
      }
      
      this.userSearchHistory.set(userId, history);

      // Store in database
      supabase
        .from('search_history')
        .insert({
          user_id: userId,
          query,
          result_count: resultCount,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Failed to store search history', 'SEMANTIC_SEARCH', error);
    }
  }

  async getSuggestions(partialQuery: string, userId?: string): Promise<SearchSuggestion[]> {
    try {
      const suggestions: SearchSuggestion[] = [];
      const lowerQuery = partialQuery.toLowerCase();

      // Auto-completion suggestions
      this.medicalTerms.forEach((data, term) => {
        if (term.startsWith(lowerQuery) && term !== lowerQuery) {
          suggestions.push({
            text: term,
            type: 'completion',
            confidence: 0.9,
            category: data.category
          });
        }
      });

      // Synonym suggestions
      this.synonyms.forEach((synonyms, term) => {
        if (term.includes(lowerQuery)) {
          synonyms.forEach(synonym => {
            suggestions.push({
              text: synonym,
              type: 'related',
              confidence: 0.7
            });
          });
        }
      });

      // User history suggestions
      if (userId) {
        const history = this.userSearchHistory.get(userId) || [];
        history.forEach(pastQuery => {
          if (pastQuery.includes(lowerQuery) && pastQuery !== lowerQuery) {
            suggestions.push({
              text: pastQuery,
              type: 'related',
              confidence: 0.8
            });
          }
        });
      }

      // Sort by confidence and remove duplicates
      const uniqueSuggestions = suggestions
        .filter((suggestion, index, self) => 
          index === self.findIndex(s => s.text === suggestion.text)
        )
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 8);

      return uniqueSuggestions;
    } catch (error) {
      errorHandler.handleError(error, 'getSuggestions');
      return [];
    }
  }

  async getPopularSearches(category?: string): Promise<string[]> {
    try {
      let query = supabase
        .from('search_history')
        .select('query')
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const { data, error } = await query;
      if (error) throw error;

      // Count query frequency
      const queryCount = new Map<string, number>();
      data?.forEach(record => {
        const count = queryCount.get(record.query) || 0;
        queryCount.set(record.query, count + 1);
      });

      // Return top queries
      return Array.from(queryCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([query]) => query);
    } catch (error) {
      errorHandler.handleError(error, 'getPopularSearches');
      return [];
    }
  }

  async updateSearchIndex(): Promise<void> {
    try {
      await this.buildSearchIndex();
      logger.info('Search index updated', 'SEMANTIC_SEARCH');
    } catch (error) {
      errorHandler.handleError(error, 'updateSearchIndex');
    }
  }
}

export const semanticSearchService = new SemanticSearchService();
