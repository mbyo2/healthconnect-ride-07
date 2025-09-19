import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { errorHandler } from './error-handler';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface Symptom {
  id: string;
  name: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
  location?: string;
  quality?: string;
  triggers?: string[];
  alleviatingFactors?: string[];
  associatedSymptoms?: string[];
}

export interface DiagnosticSuggestion {
  condition: string;
  icd10Code: string;
  probability: number;
  confidence: number;
  reasoning: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  recommendedTests: string[];
  differentialDiagnoses: string[];
  redFlags: string[];
  nextSteps: string[];
}

export interface PatientContext {
  age: number;
  gender: 'male' | 'female' | 'other';
  medicalHistory: string[];
  currentMedications: string[];
  allergies: string[];
  familyHistory: string[];
  socialHistory: {
    smoking: boolean;
    alcohol: boolean;
    occupation: string;
    travelHistory: string[];
  };
  vitalSigns?: {
    temperature: number;
    bloodPressure: string;
    heartRate: number;
    respiratoryRate: number;
    oxygenSaturation: number;
  };
}

export interface DiagnosticAnalysis {
  primarySuggestions: DiagnosticSuggestion[];
  differentialDiagnoses: DiagnosticSuggestion[];
  redFlags: string[];
  recommendedActions: string[];
  urgencyLevel: 'routine' | 'urgent' | 'emergent';
  confidence: number;
  reasoning: string;
}

class AIDiagnosticAssistant {
  private medicalKnowledgeBase: Map<string, any> = new Map();
  private symptomPatterns: Map<string, any> = new Map();
  private diagnosticRules: Map<string, any> = new Map();

  constructor() {
    this.initializeMedicalKnowledge();
  }

  private async initializeMedicalKnowledge(): Promise<void> {
    try {
      await Promise.all([
        this.loadSymptomDatabase(),
        this.loadDiagnosticRules(),
        this.loadMedicalConditions()
      ]);

      logger.info('AI Diagnostic Assistant initialized', 'AI_DIAGNOSTICS');
    } catch (error) {
      errorHandler.handleError(error, 'initializeMedicalKnowledge');
    }
  }

  private async loadSymptomDatabase(): Promise<void> {
    const symptoms = {
      'chest_pain': {
        patterns: ['crushing', 'sharp', 'burning', 'pressure'],
        locations: ['substernal', 'left_sided', 'epigastric'],
        associations: ['shortness_of_breath', 'nausea', 'sweating'],
        conditions: ['myocardial_infarction', 'angina', 'pericarditis', 'gerd']
      },
      'headache': {
        patterns: ['throbbing', 'sharp', 'dull', 'pressure'],
        locations: ['frontal', 'temporal', 'occipital', 'unilateral'],
        associations: ['nausea', 'photophobia', 'neck_stiffness'],
        conditions: ['migraine', 'tension_headache', 'cluster_headache', 'meningitis']
      },
      'abdominal_pain': {
        patterns: ['cramping', 'sharp', 'dull', 'burning'],
        locations: ['epigastric', 'right_upper_quadrant', 'left_lower_quadrant'],
        associations: ['nausea', 'vomiting', 'fever', 'diarrhea'],
        conditions: ['appendicitis', 'cholecystitis', 'gastritis', 'ibs']
      }
    };

    Object.entries(symptoms).forEach(([key, data]) => {
      this.symptomPatterns.set(key, data);
    });
  }

  private async loadDiagnosticRules(): Promise<void> {
    const rules = {
      'chest_pain_mi': {
        criteria: ['chest_pain', 'shortness_of_breath', 'sweating'],
        ageWeight: { '>65': 2, '45-65': 1.5, '<45': 0.5 },
        riskFactors: ['diabetes', 'hypertension', 'smoking', 'family_history'],
        urgency: 'emergency',
        confidence: 0.8
      },
      'headache_migraine': {
        criteria: ['headache', 'photophobia', 'nausea'],
        triggers: ['stress', 'hormonal', 'food'],
        duration: '>4hours',
        urgency: 'routine',
        confidence: 0.7
      }
    };

    Object.entries(rules).forEach(([key, rule]) => {
      this.diagnosticRules.set(key, rule);
    });
  }

  private async loadMedicalConditions(): Promise<void> {
    const conditions = {
      'myocardial_infarction': {
        icd10: 'I21.9',
        symptoms: ['chest_pain', 'shortness_of_breath', 'nausea', 'sweating'],
        riskFactors: ['age', 'diabetes', 'hypertension', 'smoking'],
        tests: ['ECG', 'Troponin', 'CK-MB'],
        urgency: 'emergency'
      },
      'migraine': {
        icd10: 'G43.9',
        symptoms: ['headache', 'photophobia', 'phonophobia', 'nausea'],
        triggers: ['stress', 'hormonal_changes', 'certain_foods'],
        tests: ['Clinical_diagnosis', 'MRI_if_atypical'],
        urgency: 'routine'
      }
    };

    Object.entries(conditions).forEach(([key, condition]) => {
      this.medicalKnowledgeBase.set(key, condition);
    });
  }

  async analyzeSymptoms(
    symptoms: Symptom[], 
    patientContext: PatientContext
  ): Promise<DiagnosticAnalysis> {
    try {
      logger.info('Starting symptom analysis', 'AI_DIAGNOSTICS', { 
        symptomCount: symptoms.length,
        patientAge: patientContext.age 
      });

      // Generate diagnostic suggestions
      const suggestions = await this.generateDiagnosticSuggestions(symptoms, patientContext);
      
      // Assess urgency and red flags
      const { urgency, redFlags } = this.assessUrgency(symptoms, suggestions);
      
      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(suggestions);
      
      // Generate reasoning
      const reasoning = this.generateReasoning(symptoms, suggestions, patientContext);
      
      // Recommend actions
      const actions = this.generateRecommendedActions(suggestions, urgency);

      const analysis: DiagnosticAnalysis = {
        primarySuggestions: suggestions.slice(0, 3),
        differentialDiagnoses: suggestions.slice(3, 8),
        redFlags,
        recommendedActions: actions,
        urgencyLevel: urgency,
        confidence,
        reasoning
      };

      // Store analysis for learning
      await this.storeAnalysis(symptoms, patientContext, analysis);

      logger.info('Symptom analysis completed', 'AI_DIAGNOSTICS', {
        primarySuggestions: analysis.primarySuggestions.length,
        confidence: analysis.confidence
      });

      return analysis;
    } catch (error) {
      errorHandler.handleError(error, 'analyzeSymptoms');
      throw error;
    }
  }

  private async generateDiagnosticSuggestions(
    symptoms: Symptom[], 
    context: PatientContext
  ): Promise<DiagnosticSuggestion[]> {
    const suggestions: DiagnosticSuggestion[] = [];
    const symptomNames = symptoms.map(s => s.name.toLowerCase().replace(/\s+/g, '_'));

    // Pattern matching against known conditions
    this.medicalKnowledgeBase.forEach((condition, conditionKey) => {
      const matchScore = this.calculateSymptomMatch(symptomNames, condition.symptoms);
      
      if (matchScore > 0.3) {
        const contextScore = this.calculateContextScore(context, condition);
        const probability = (matchScore * 0.7) + (contextScore * 0.3);
        
        const suggestion: DiagnosticSuggestion = {
          condition: conditionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          icd10Code: condition.icd10,
          probability: Math.min(probability, 0.95),
          confidence: this.calculateConfidence(matchScore, contextScore, symptoms.length),
          reasoning: this.generateConditionReasoning(symptoms, condition, matchScore),
          urgency: condition.urgency,
          recommendedTests: condition.tests || [],
          differentialDiagnoses: this.getDifferentialDiagnoses(conditionKey),
          redFlags: this.getRedFlags(conditionKey, symptoms),
          nextSteps: this.getNextSteps(condition.urgency, condition.tests)
        };

        suggestions.push(suggestion);
      }
    });

    // Sort by probability and confidence
    return suggestions.sort((a, b) => 
      (b.probability * b.confidence) - (a.probability * a.confidence)
    );
  }

  private calculateSymptomMatch(patientSymptoms: string[], conditionSymptoms: string[]): number {
    const matches = patientSymptoms.filter(symptom => 
      conditionSymptoms.some(condSymptom => 
        symptom.includes(condSymptom) || condSymptom.includes(symptom)
      )
    );
    
    return matches.length / Math.max(patientSymptoms.length, conditionSymptoms.length);
  }

  private calculateContextScore(context: PatientContext, condition: any): number {
    let score = 0.5; // Base score
    
    // Age factor
    if (condition.ageRisk) {
      if (context.age >= 65 && condition.ageRisk.elderly) score += 0.2;
      if (context.age <= 18 && condition.ageRisk.pediatric) score += 0.2;
    }
    
    // Risk factors
    if (condition.riskFactors && context.medicalHistory) {
      const riskMatches = condition.riskFactors.filter((risk: string) =>
        context.medicalHistory.some(history => 
          history.toLowerCase().includes(risk.toLowerCase())
        )
      );
      score += (riskMatches.length / condition.riskFactors.length) * 0.3;
    }
    
    // Gender specificity
    if (condition.genderSpecific && condition.genderSpecific === context.gender) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  private calculateConfidence(matchScore: number, contextScore: number, symptomCount: number): number {
    let confidence = (matchScore + contextScore) / 2;
    
    // Adjust for symptom count
    if (symptomCount >= 3) confidence += 0.1;
    if (symptomCount >= 5) confidence += 0.1;
    
    // Cap confidence
    return Math.min(confidence, 0.9);
  }

  private generateConditionReasoning(symptoms: Symptom[], condition: any, matchScore: number): string {
    const matchedSymptoms = symptoms.filter(symptom =>
      condition.symptoms.some((condSymptom: string) =>
        symptom.name.toLowerCase().includes(condSymptom.replace(/_/g, ' '))
      )
    );

    return `Based on ${matchedSymptoms.length} matching symptoms: ${matchedSymptoms.map(s => s.name).join(', ')}. Match confidence: ${(matchScore * 100).toFixed(1)}%`;
  }

  private getDifferentialDiagnoses(condition: string): string[] {
    const differentials: Record<string, string[]> = {
      'myocardial_infarction': ['Angina', 'Pericarditis', 'Pulmonary Embolism', 'GERD'],
      'migraine': ['Tension Headache', 'Cluster Headache', 'Sinusitis', 'Meningitis'],
      'appendicitis': ['Gastroenteritis', 'Ovarian Cyst', 'Kidney Stone', 'IBD']
    };
    
    return differentials[condition] || [];
  }

  private getRedFlags(condition: string, symptoms: Symptom[]): string[] {
    const redFlags: Record<string, string[]> = {
      'myocardial_infarction': ['Severe chest pain', 'Shortness of breath', 'Diaphoresis'],
      'migraine': ['Sudden onset', 'Fever', 'Neck stiffness', 'Altered consciousness'],
      'appendicitis': ['Severe abdominal pain', 'Fever', 'Vomiting', 'Rebound tenderness']
    };
    
    const conditionFlags = redFlags[condition] || [];
    return conditionFlags.filter(flag =>
      symptoms.some(symptom => 
        symptom.name.toLowerCase().includes(flag.toLowerCase()) ||
        symptom.severity === 'severe'
      )
    );
  }

  private getNextSteps(urgency: string, tests: string[]): string[] {
    const steps = [];
    
    if (urgency === 'emergency') {
      steps.push('Immediate medical attention required');
      steps.push('Call emergency services');
    } else if (urgency === 'urgent') {
      steps.push('Seek medical care within 24 hours');
    } else {
      steps.push('Schedule appointment with primary care physician');
    }
    
    if (tests && tests.length > 0) {
      steps.push(`Recommended tests: ${tests.join(', ')}`);
    }
    
    return steps;
  }

  private assessUrgency(symptoms: Symptom[], suggestions: DiagnosticSuggestion[]): {
    urgency: 'routine' | 'urgent' | 'emergent';
    redFlags: string[];
  } {
    let urgency: 'routine' | 'urgent' | 'emergent' = 'routine';
    const redFlags: string[] = [];
    
    // Check for emergency conditions
    const emergencyConditions = suggestions.filter(s => s.urgency === 'emergency');
    if (emergencyConditions.length > 0) {
      urgency = 'emergent';
      redFlags.push(...emergencyConditions.flatMap(c => c.redFlags));
    }
    
    // Check for severe symptoms
    const severeSymptoms = symptoms.filter(s => s.severity === 'severe');
    if (severeSymptoms.length > 0) {
      urgency = urgency === 'routine' ? 'urgent' : urgency;
      redFlags.push(...severeSymptoms.map(s => `Severe ${s.name}`));
    }
    
    return { urgency, redFlags: [...new Set(redFlags)] };
  }

  private calculateOverallConfidence(suggestions: DiagnosticSuggestion[]): number {
    if (suggestions.length === 0) return 0;
    
    const topSuggestions = suggestions.slice(0, 3);
    const avgConfidence = topSuggestions.reduce((sum, s) => sum + s.confidence, 0) / topSuggestions.length;
    
    return avgConfidence;
  }

  private generateReasoning(symptoms: Symptom[], suggestions: DiagnosticSuggestion[], context: PatientContext): string {
    const symptomList = symptoms.map(s => s.name).join(', ');
    const topCondition = suggestions[0]?.condition || 'Unknown';
    
    return `Analysis of ${symptoms.length} symptoms (${symptomList}) in ${context.age}-year-old ${context.gender} patient suggests ${topCondition} as most likely diagnosis based on symptom pattern matching and clinical context.`;
  }

  private generateRecommendedActions(suggestions: DiagnosticSuggestion[], urgency: string): string[] {
    const actions = [];
    
    if (urgency === 'emergent') {
      actions.push('Seek immediate emergency care');
      actions.push('Monitor vital signs');
    } else if (urgency === 'urgent') {
      actions.push('Schedule urgent medical consultation');
      actions.push('Monitor symptoms closely');
    } else {
      actions.push('Schedule routine medical appointment');
    }
    
    if (suggestions.length > 0) {
      const tests = [...new Set(suggestions.flatMap(s => s.recommendedTests))];
      if (tests.length > 0) {
        actions.push(`Consider diagnostic tests: ${tests.slice(0, 3).join(', ')}`);
      }
    }
    
    return actions;
  }

  private async storeAnalysis(symptoms: Symptom[], context: PatientContext, analysis: DiagnosticAnalysis): Promise<void> {
    try {
      await supabase.from('diagnostic_analyses').insert({
        symptoms: JSON.stringify(symptoms),
        patient_context: JSON.stringify(context),
        analysis_result: JSON.stringify(analysis),
        created_at: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to store diagnostic analysis', 'AI_DIAGNOSTICS', error);
    }
  }

  async getSymptomSuggestions(partialSymptom: string): Promise<string[]> {
    const commonSymptoms = [
      'chest pain', 'headache', 'abdominal pain', 'shortness of breath',
      'nausea', 'vomiting', 'fever', 'fatigue', 'dizziness', 'cough',
      'sore throat', 'back pain', 'joint pain', 'rash', 'swelling'
    ];
    
    return commonSymptoms.filter(symptom =>
      symptom.toLowerCase().includes(partialSymptom.toLowerCase())
    );
  }

  async validateDiagnosis(diagnosis: string, symptoms: Symptom[]): Promise<{
    isValid: boolean;
    confidence: number;
    reasoning: string;
  }> {
    const condition = this.medicalKnowledgeBase.get(diagnosis.toLowerCase().replace(/\s+/g, '_'));
    
    if (!condition) {
      return {
        isValid: false,
        confidence: 0,
        reasoning: 'Diagnosis not found in knowledge base'
      };
    }
    
    const symptomNames = symptoms.map(s => s.name.toLowerCase().replace(/\s+/g, '_'));
    const matchScore = this.calculateSymptomMatch(symptomNames, condition.symptoms);
    
    return {
      isValid: matchScore > 0.5,
      confidence: matchScore,
      reasoning: `${Math.round(matchScore * 100)}% symptom match with known condition pattern`
    };
  }
}

export const aiDiagnosticAssistant = new AIDiagnosticAssistant();
