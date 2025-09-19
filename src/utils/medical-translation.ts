import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { errorHandler } from './error-handler';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface Translation {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  context: 'medical' | 'ui' | 'general' | 'emergency';
  confidence: number;
  verified: boolean;
  createdAt: string;
  verifiedBy?: string;
}

export interface MedicalTermTranslation {
  term: string;
  translations: Record<string, {
    translation: string;
    pronunciation?: string;
    definition: string;
    synonyms: string[];
  }>;
  category: 'anatomy' | 'condition' | 'procedure' | 'medication' | 'symptom';
  icd10?: string;
}

export interface LanguageProfile {
  userId: string;
  primaryLanguage: string;
  secondaryLanguages: string[];
  medicalTermPreference: 'technical' | 'simplified' | 'both';
  translationQuality: 'fast' | 'accurate' | 'verified';
  autoTranslate: boolean;
  emergencyLanguage: string;
}

export interface ConversationContext {
  participantLanguages: string[];
  medicalSpecialty?: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  previousTranslations: Translation[];
}

class MedicalTranslationService {
  private supportedLanguages: Map<string, any> = new Map();
  private medicalTerms: Map<string, MedicalTermTranslation> = new Map();
  private translationCache: Map<string, Translation> = new Map();
  private languageProfiles: Map<string, LanguageProfile> = new Map();

  constructor() {
    this.initializeTranslationService();
  }

  private async initializeTranslationService(): Promise<void> {
    try {
      await this.loadSupportedLanguages();
      await this.loadMedicalTerminology();
      await this.loadTranslationCache();
      
      logger.info('Medical Translation Service initialized', 'TRANSLATION');
    } catch (error) {
      errorHandler.handleError(error, 'initializeTranslationService');
    }
  }

  private async loadSupportedLanguages(): Promise<void> {
    const languages = {
      'en': {
        name: 'English',
        nativeName: 'English',
        rtl: false,
        medicalSupport: 'full',
        emergencySupport: true
      },
      'es': {
        name: 'Spanish',
        nativeName: 'Español',
        rtl: false,
        medicalSupport: 'full',
        emergencySupport: true
      },
      'fr': {
        name: 'French',
        nativeName: 'Français',
        rtl: false,
        medicalSupport: 'full',
        emergencySupport: true
      },
      'de': {
        name: 'German',
        nativeName: 'Deutsch',
        rtl: false,
        medicalSupport: 'full',
        emergencySupport: true
      },
      'zh': {
        name: 'Chinese',
        nativeName: '中文',
        rtl: false,
        medicalSupport: 'partial',
        emergencySupport: true
      },
      'ar': {
        name: 'Arabic',
        nativeName: 'العربية',
        rtl: true,
        medicalSupport: 'partial',
        emergencySupport: true
      },
      'hi': {
        name: 'Hindi',
        nativeName: 'हिन्दी',
        rtl: false,
        medicalSupport: 'basic',
        emergencySupport: true
      },
      'pt': {
        name: 'Portuguese',
        nativeName: 'Português',
        rtl: false,
        medicalSupport: 'full',
        emergencySupport: true
      }
    };

    Object.entries(languages).forEach(([code, info]) => {
      this.supportedLanguages.set(code, info);
    });

    logger.info(`Loaded ${this.supportedLanguages.size} supported languages`, 'TRANSLATION');
  }

  private async loadMedicalTerminology(): Promise<void> {
    const medicalTerms = [
      {
        term: 'hypertension',
        translations: {
          'es': {
            translation: 'hipertensión',
            pronunciation: 'ee-per-ten-SYOHN',
            definition: 'Presión arterial alta',
            synonyms: ['presión alta', 'tensión alta']
          },
          'fr': {
            translation: 'hypertension',
            pronunciation: 'ee-per-tan-SYOHN',
            definition: 'Pression artérielle élevée',
            synonyms: ['tension artérielle élevée']
          },
          'de': {
            translation: 'Bluthochdruck',
            pronunciation: 'BLOOT-hokh-drook',
            definition: 'Hoher Blutdruck',
            synonyms: ['Hypertonie', 'arterielle Hypertonie']
          }
        },
        category: 'condition' as const,
        icd10: 'I10'
      },
      {
        term: 'diabetes',
        translations: {
          'es': {
            translation: 'diabetes',
            pronunciation: 'dee-ah-BEH-tes',
            definition: 'Enfermedad que afecta el azúcar en la sangre',
            synonyms: ['diabetes mellitus']
          },
          'fr': {
            translation: 'diabète',
            pronunciation: 'dee-ah-BET',
            definition: 'Maladie affectant la glycémie',
            synonyms: ['diabète sucré']
          },
          'de': {
            translation: 'Diabetes',
            pronunciation: 'dee-ah-BEH-tes',
            definition: 'Zuckerkrankheit',
            synonyms: ['Diabetes mellitus', 'Zuckerkrankheit']
          }
        },
        category: 'condition' as const,
        icd10: 'E11'
      }
    ];

    medicalTerms.forEach(term => {
      this.medicalTerms.set(term.term, term);
    });
  }

  private async loadTranslationCache(): Promise<void> {
    try {
      const { data: cachedTranslations } = await supabase
        .from('translations')
        .select('*')
        .eq('verified', true)
        .limit(1000);

      if (cachedTranslations) {
        cachedTranslations.forEach(translation => {
          const cacheKey = this.getCacheKey(translation.sourceText, translation.sourceLanguage, translation.targetLanguage);
          this.translationCache.set(cacheKey, translation);
        });
      }

      logger.info(`Loaded ${this.translationCache.size} cached translations`, 'TRANSLATION');
    } catch (error) {
      logger.error('Failed to load translation cache', 'TRANSLATION', error);
    }
  }

  async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: Translation['context'] = 'general',
    conversationContext?: ConversationContext
  ): Promise<Translation> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(text, sourceLanguage, targetLanguage);
      const cached = this.translationCache.get(cacheKey);
      
      if (cached && (context !== 'emergency' || cached.verified)) {
        return cached;
      }

      // Perform translation
      const translation = await this.performTranslation(text, sourceLanguage, targetLanguage, context, conversationContext);
      
      // Cache the result
      this.translationCache.set(cacheKey, translation);
      
      // Store in database
      await supabase.from('translations').insert(translation);

      logger.info('Text translated', 'TRANSLATION', {
        sourceLanguage,
        targetLanguage,
        context,
        confidence: translation.confidence
      });

      return translation;
    } catch (error) {
      errorHandler.handleError(error, 'translateText');
      throw error;
    }
  }

  private async performTranslation(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: Translation['context'],
    conversationContext?: ConversationContext
  ): Promise<Translation> {
    // Enhanced medical translation with context awareness
    let translatedText = await this.basicTranslation(text, sourceLanguage, targetLanguage);
    let confidence = 0.7;

    // Apply medical terminology corrections
    if (context === 'medical' || context === 'emergency') {
      const medicalCorrection = await this.applyMedicalTerminology(translatedText, targetLanguage);
      translatedText = medicalCorrection.text;
      confidence = Math.min(confidence + medicalCorrection.confidenceBoost, 0.95);
    }

    // Apply conversation context
    if (conversationContext) {
      const contextualCorrection = await this.applyConversationalContext(
        translatedText, 
        conversationContext, 
        targetLanguage
      );
      translatedText = contextualCorrection.text;
      confidence = Math.min(confidence + contextualCorrection.confidenceBoost, 0.95);
    }

    // Emergency translations get priority verification
    const verified = context === 'emergency' ? await this.emergencyVerification(translatedText, targetLanguage) : false;

    const translation: Translation = {
      id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceText: text,
      translatedText,
      sourceLanguage,
      targetLanguage,
      context,
      confidence,
      verified,
      createdAt: new Date().toISOString()
    };

    return translation;
  }

  private async basicTranslation(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
    // Simplified translation - in production, this would use actual translation APIs
    const translations: Record<string, Record<string, string>> = {
      'en': {
        'es': this.translateToSpanish(text),
        'fr': this.translateToFrench(text),
        'de': this.translateToGerman(text)
      }
    };

    return translations[sourceLanguage]?.[targetLanguage] || text;
  }

  private translateToSpanish(text: string): string {
    const commonTranslations: Record<string, string> = {
      'hello': 'hola',
      'pain': 'dolor',
      'help': 'ayuda',
      'emergency': 'emergencia',
      'doctor': 'doctor',
      'hospital': 'hospital',
      'medicine': 'medicina',
      'appointment': 'cita',
      'symptoms': 'síntomas',
      'treatment': 'tratamiento'
    };

    let translated = text.toLowerCase();
    Object.entries(commonTranslations).forEach(([en, es]) => {
      translated = translated.replace(new RegExp(`\\b${en}\\b`, 'g'), es);
    });

    return translated;
  }

  private translateToFrench(text: string): string {
    const commonTranslations: Record<string, string> = {
      'hello': 'bonjour',
      'pain': 'douleur',
      'help': 'aide',
      'emergency': 'urgence',
      'doctor': 'médecin',
      'hospital': 'hôpital',
      'medicine': 'médicament',
      'appointment': 'rendez-vous',
      'symptoms': 'symptômes',
      'treatment': 'traitement'
    };

    let translated = text.toLowerCase();
    Object.entries(commonTranslations).forEach(([en, fr]) => {
      translated = translated.replace(new RegExp(`\\b${en}\\b`, 'g'), fr);
    });

    return translated;
  }

  private translateToGerman(text: string): string {
    const commonTranslations: Record<string, string> = {
      'hello': 'hallo',
      'pain': 'Schmerz',
      'help': 'Hilfe',
      'emergency': 'Notfall',
      'doctor': 'Arzt',
      'hospital': 'Krankenhaus',
      'medicine': 'Medizin',
      'appointment': 'Termin',
      'symptoms': 'Symptome',
      'treatment': 'Behandlung'
    };

    let translated = text.toLowerCase();
    Object.entries(commonTranslations).forEach(([en, de]) => {
      translated = translated.replace(new RegExp(`\\b${en}\\b`, 'g'), de);
    });

    return translated;
  }

  private async applyMedicalTerminology(text: string, targetLanguage: string): Promise<{
    text: string;
    confidenceBoost: number;
  }> {
    let correctedText = text;
    let confidenceBoost = 0;

    this.medicalTerms.forEach((termData, englishTerm) => {
      const translation = termData.translations[targetLanguage];
      if (translation) {
        // Replace English medical terms with proper translations
        const regex = new RegExp(`\\b${englishTerm}\\b`, 'gi');
        if (regex.test(correctedText)) {
          correctedText = correctedText.replace(regex, translation.translation);
          confidenceBoost += 0.1;
        }

        // Also check for synonyms
        translation.synonyms.forEach(synonym => {
          const synonymRegex = new RegExp(`\\b${synonym}\\b`, 'gi');
          if (synonymRegex.test(correctedText)) {
            confidenceBoost += 0.05;
          }
        });
      }
    });

    return {
      text: correctedText,
      confidenceBoost: Math.min(confidenceBoost, 0.2)
    };
  }

  private async applyConversationalContext(
    text: string,
    context: ConversationContext,
    targetLanguage: string
  ): Promise<{ text: string; confidenceBoost: number }> {
    let contextualText = text;
    let confidenceBoost = 0;

    // Apply urgency-based modifications
    if (context.urgencyLevel === 'emergency') {
      const urgentPhrases: Record<string, string> = {
        'es': 'URGENTE: ',
        'fr': 'URGENT: ',
        'de': 'DRINGEND: '
      };
      
      const urgentPrefix = urgentPhrases[targetLanguage];
      if (urgentPrefix && !contextualText.startsWith(urgentPrefix)) {
        contextualText = urgentPrefix + contextualText;
        confidenceBoost += 0.1;
      }
    }

    // Apply medical specialty context
    if (context.medicalSpecialty) {
      confidenceBoost += 0.05;
    }

    // Learn from previous translations in conversation
    if (context.previousTranslations.length > 0) {
      confidenceBoost += 0.05;
    }

    return {
      text: contextualText,
      confidenceBoost: Math.min(confidenceBoost, 0.15)
    };
  }

  private async emergencyVerification(text: string, language: string): Promise<boolean> {
    // In production, this would involve human verification for emergency translations
    // For now, return true for supported languages with full medical support
    const languageInfo = this.supportedLanguages.get(language);
    return languageInfo?.emergencySupport === true && languageInfo?.medicalSupport === 'full';
  }

  async translateMedicalDocument(
    document: any,
    sourceLanguage: string,
    targetLanguage: string,
    preserveFormatting: boolean = true
  ): Promise<any> {
    try {
      const translatedDocument = { ...document };
      
      // Translate text fields while preserving structure
      await this.translateObjectFields(translatedDocument, sourceLanguage, targetLanguage, 'medical');
      
      // Store translation record
      await supabase.from('document_translations').insert({
        source_document_id: document.id,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        translated_document: JSON.stringify(translatedDocument),
        created_at: new Date().toISOString()
      });

      logger.info('Medical document translated', 'TRANSLATION', {
        documentId: document.id,
        sourceLanguage,
        targetLanguage
      });

      return translatedDocument;
    } catch (error) {
      errorHandler.handleError(error, 'translateMedicalDocument');
      throw error;
    }
  }

  private async translateObjectFields(
    obj: any,
    sourceLanguage: string,
    targetLanguage: string,
    context: Translation['context']
  ): Promise<void> {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        const translation = await this.translateText(value, sourceLanguage, targetLanguage, context);
        obj[key] = translation.translatedText;
      } else if (typeof value === 'object' && value !== null) {
        await this.translateObjectFields(value, sourceLanguage, targetLanguage, context);
      }
    }
  }

  async createLanguageProfile(userId: string, profile: Omit<LanguageProfile, 'userId'>): Promise<LanguageProfile> {
    try {
      const languageProfile: LanguageProfile = {
        userId,
        ...profile
      };

      await supabase.from('language_profiles').upsert({
        user_id: userId,
        profile: JSON.stringify(languageProfile),
        updated_at: new Date().toISOString()
      });

      this.languageProfiles.set(userId, languageProfile);

      logger.info('Language profile created', 'TRANSLATION', { userId, primaryLanguage: profile.primaryLanguage });
      return languageProfile;
    } catch (error) {
      errorHandler.handleError(error, 'createLanguageProfile');
      throw error;
    }
  }

  async getLanguageProfile(userId: string): Promise<LanguageProfile | null> {
    try {
      const cached = this.languageProfiles.get(userId);
      if (cached) return cached;

      const { data } = await supabase
        .from('language_profiles')
        .select('profile')
        .eq('user_id', userId)
        .single();

      if (data?.profile) {
        const profile = JSON.parse(data.profile);
        this.languageProfiles.set(userId, profile);
        return profile;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get language profile', 'TRANSLATION', error);
      return null;
    }
  }

  async translateConversation(
    messages: any[],
    participantLanguages: string[],
    medicalContext?: string
  ): Promise<any[]> {
    try {
      const translatedMessages = [];

      for (const message of messages) {
        const translatedMessage = { ...message, translations: {} };

        // Translate to all participant languages
        for (const targetLanguage of participantLanguages) {
          if (targetLanguage !== message.language) {
            const translation = await this.translateText(
              message.content,
              message.language,
              targetLanguage,
              'medical',
              {
                participantLanguages,
                medicalSpecialty: medicalContext,
                urgencyLevel: message.urgent ? 'emergency' : 'medium',
                previousTranslations: []
              }
            );

            translatedMessage.translations[targetLanguage] = {
              text: translation.translatedText,
              confidence: translation.confidence
            };
          }
        }

        translatedMessages.push(translatedMessage);
      }

      return translatedMessages;
    } catch (error) {
      errorHandler.handleError(error, 'translateConversation');
      return messages;
    }
  }

  async getMedicalTermTranslation(
    term: string,
    targetLanguage: string,
    includeDefinition: boolean = true
  ): Promise<any> {
    try {
      const termData = this.medicalTerms.get(term.toLowerCase());
      if (!termData) {
        return null;
      }

      const translation = termData.translations[targetLanguage];
      if (!translation) {
        return null;
      }

      return {
        originalTerm: term,
        translation: translation.translation,
        pronunciation: translation.pronunciation,
        definition: includeDefinition ? translation.definition : undefined,
        synonyms: translation.synonyms,
        category: termData.category,
        icd10: termData.icd10
      };
    } catch (error) {
      errorHandler.handleError(error, 'getMedicalTermTranslation');
      return null;
    }
  }

  async generateEmergencyPhrases(language: string): Promise<string[]> {
    const emergencyPhrases = {
      'es': [
        'Necesito ayuda médica urgente',
        'Llame a una ambulancia',
        'Tengo dolor en el pecho',
        'No puedo respirar',
        'Estoy sangrando',
        'He perdido el conocimiento',
        'Soy alérgico a...',
        '¿Dónde está el hospital más cercano?'
      ],
      'fr': [
        'J\'ai besoin d\'aide médicale urgente',
        'Appelez une ambulance',
        'J\'ai mal à la poitrine',
        'Je ne peux pas respirer',
        'Je saigne',
        'J\'ai perdu connaissance',
        'Je suis allergique à...',
        'Où est l\'hôpital le plus proche?'
      ],
      'de': [
        'Ich brauche dringend medizinische Hilfe',
        'Rufen Sie einen Krankenwagen',
        'Ich habe Brustschmerzen',
        'Ich kann nicht atmen',
        'Ich blute',
        'Ich war bewusstlos',
        'Ich bin allergisch gegen...',
        'Wo ist das nächste Krankenhaus?'
      ]
    };

    return emergencyPhrases[language] || emergencyPhrases['en'] || [];
  }

  private getCacheKey(text: string, sourceLanguage: string, targetLanguage: string): string {
    return `${sourceLanguage}-${targetLanguage}-${text.substring(0, 50)}`;
  }

  async getTranslationQuality(translationId: string): Promise<any> {
    try {
      const { data: feedback } = await supabase
        .from('translation_feedback')
        .select('*')
        .eq('translation_id', translationId);

      if (!feedback || feedback.length === 0) {
        return { quality: 'unknown', feedbackCount: 0 };
      }

      const avgRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
      const qualityLevel = avgRating >= 4 ? 'excellent' : avgRating >= 3 ? 'good' : 'poor';

      return {
        quality: qualityLevel,
        averageRating: avgRating,
        feedbackCount: feedback.length,
        commonIssues: feedback.filter(f => f.issues).map(f => f.issues)
      };
    } catch (error) {
      errorHandler.handleError(error, 'getTranslationQuality');
      return { quality: 'unknown', feedbackCount: 0 };
    }
  }

  getSupportedLanguages(): Array<{ code: string; name: string; nativeName: string; medicalSupport: string }> {
    return Array.from(this.supportedLanguages.entries()).map(([code, info]) => ({
      code,
      name: info.name,
      nativeName: info.nativeName,
      medicalSupport: info.medicalSupport
    }));
  }
}

export const medicalTranslationService = new MedicalTranslationService();
