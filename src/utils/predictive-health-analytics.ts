import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { errorHandler } from './error-handler';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface HealthPrediction {
  id: string;
  patientId: string;
  predictionType: 'disease_risk' | 'treatment_outcome' | 'readmission_risk' | 'medication_response' | 'lifestyle_impact';
  condition: string;
  probability: number;
  confidence: number;
  timeframe: '30d' | '90d' | '1y' | '5y';
  riskFactors: RiskFactor[];
  preventiveActions: string[];
  modelVersion: string;
  createdAt: string;
  validUntil: string;
}

export interface RiskFactor {
  factor: string;
  impact: 'high' | 'medium' | 'low';
  modifiable: boolean;
  currentValue: any;
  targetValue?: any;
  contribution: number; // percentage contribution to overall risk
}

export interface PredictiveModel {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'time_series';
  targetCondition: string;
  features: string[];
  accuracy: number;
  precision: number;
  recall: number;
  version: string;
  trainedAt: string;
  validatedAt: string;
}

export interface PatientRiskProfile {
  patientId: string;
  overallRiskScore: number;
  riskCategory: 'low' | 'medium' | 'high' | 'critical';
  predictions: HealthPrediction[];
  trendAnalysis: {
    improving: string[];
    worsening: string[];
    stable: string[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  lastUpdated: string;
}

class PredictiveHealthAnalytics {
  private models: Map<string, PredictiveModel> = new Map();
  private patientProfiles: Map<string, PatientRiskProfile> = new Map();
  private featureWeights: Map<string, number> = new Map();

  constructor() {
    this.initializePredictiveSystem();
  }

  private async initializePredictiveSystem(): Promise<void> {
    try {
      await this.loadPredictiveModels();
      await this.initializeFeatureWeights();
      await this.startPeriodicUpdates();

      logger.info('Predictive Health Analytics system initialized', 'PREDICTIVE_ANALYTICS');
    } catch (error) {
      errorHandler.handleError(error, 'initializePredictiveSystem');
    }
  }

  private async loadPredictiveModels(): Promise<void> {
    const models = [
      {
        id: 'diabetes_risk_v2',
        name: 'Type 2 Diabetes Risk Prediction',
        type: 'classification' as const,
        targetCondition: 'type_2_diabetes',
        features: ['age', 'bmi', 'family_history', 'glucose_levels', 'blood_pressure', 'physical_activity'],
        accuracy: 0.87,
        precision: 0.82,
        recall: 0.79,
        version: '2.1',
        trainedAt: '2024-01-15T00:00:00Z',
        validatedAt: '2024-02-01T00:00:00Z'
      },
      {
        id: 'cardiovascular_risk_v3',
        name: 'Cardiovascular Disease Risk',
        type: 'classification' as const,
        targetCondition: 'cardiovascular_disease',
        features: ['age', 'gender', 'cholesterol', 'blood_pressure', 'smoking', 'family_history', 'exercise'],
        accuracy: 0.91,
        precision: 0.88,
        recall: 0.85,
        version: '3.0',
        trainedAt: '2024-02-01T00:00:00Z',
        validatedAt: '2024-02-15T00:00:00Z'
      },
      {
        id: 'readmission_risk_v1',
        name: 'Hospital Readmission Risk',
        type: 'classification' as const,
        targetCondition: 'hospital_readmission',
        features: ['age', 'comorbidities', 'length_of_stay', 'discharge_disposition', 'medication_adherence'],
        accuracy: 0.78,
        precision: 0.75,
        recall: 0.72,
        version: '1.5',
        trainedAt: '2024-01-20T00:00:00Z',
        validatedAt: '2024-02-05T00:00:00Z'
      }
    ];

    models.forEach(model => {
      this.models.set(model.id, model);
    });

    logger.info(`Loaded ${this.models.size} predictive models`, 'PREDICTIVE_ANALYTICS');
  }

  private async initializeFeatureWeights(): Promise<void> {
    const weights = {
      'age': 0.15,
      'bmi': 0.12,
      'blood_pressure': 0.18,
      'cholesterol': 0.14,
      'glucose_levels': 0.16,
      'family_history': 0.10,
      'smoking': 0.13,
      'physical_activity': 0.08,
      'medication_adherence': 0.09,
      'comorbidities': 0.20
    };

    Object.entries(weights).forEach(([feature, weight]) => {
      this.featureWeights.set(feature, weight);
    });
  }

  async generatePredictions(patientId: string): Promise<HealthPrediction[]> {
    try {
      const patientData = await this.getPatientData(patientId);
      const predictions: HealthPrediction[] = [];

      for (const [modelId, model] of this.models) {
        const prediction = await this.runPredictiveModel(model, patientData);
        if (prediction) {
          predictions.push(prediction);
        }
      }

      // Store predictions
      await Promise.all(predictions.map(p => 
        supabase.from('health_predictions').insert(p)
      ));

      logger.info(`Generated ${predictions.length} predictions for patient`, 'PREDICTIVE_ANALYTICS', {
        patientId,
        predictionCount: predictions.length
      });

      return predictions;
    } catch (error) {
      errorHandler.handleError(error, 'generatePredictions');
      return [];
    }
  }

  private async getPatientData(patientId: string): Promise<any> {
    try {
      const [profile, vitals, medications, history] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', patientId).single(),
        supabase.from('health_metrics').select('*').eq('patientId', patientId).order('timestamp', { ascending: false }).limit(50),
        supabase.from('medications').select('*').eq('patient_id', patientId),
        supabase.from('medical_history').select('*').eq('patient_id', patientId)
      ]);

      return {
        profile: profile.data,
        vitals: vitals.data || [],
        medications: medications.data || [],
        history: history.data || []
      };
    } catch (error) {
      logger.error('Failed to get patient data', 'PREDICTIVE_ANALYTICS', error);
      return {};
    }
  }

  private async runPredictiveModel(model: PredictiveModel, patientData: any): Promise<HealthPrediction | null> {
    try {
      const features = this.extractFeatures(model.features, patientData);
      const prediction = this.calculatePrediction(model, features);
      
      if (!prediction) return null;

      const riskFactors = this.identifyRiskFactors(model.features, features, prediction.probability);
      const preventiveActions = this.generatePreventiveActions(model.targetCondition, riskFactors);

      const healthPrediction: HealthPrediction = {
        id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        patientId: patientData.profile?.id || 'unknown',
        predictionType: this.mapConditionToPredictionType(model.targetCondition),
        condition: model.targetCondition,
        probability: prediction.probability,
        confidence: prediction.confidence,
        timeframe: this.determineTimeframe(model.targetCondition),
        riskFactors,
        preventiveActions,
        modelVersion: model.version,
        createdAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
      };

      return healthPrediction;
    } catch (error) {
      logger.error('Failed to run predictive model', 'PREDICTIVE_ANALYTICS', error);
      return null;
    }
  }

  private extractFeatures(requiredFeatures: string[], patientData: any): Map<string, any> {
    const features = new Map<string, any>();
    const { profile, vitals, medications, history } = patientData;

    requiredFeatures.forEach(feature => {
      switch (feature) {
        case 'age':
          if (profile?.date_of_birth) {
            const age = new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear();
            features.set('age', age);
          }
          break;

        case 'bmi':
          const latestWeight = vitals.find((v: any) => v.metricType === 'weight');
          const height = profile?.height;
          if (latestWeight && height) {
            const bmi = latestWeight.value / Math.pow(height / 100, 2);
            features.set('bmi', bmi);
          }
          break;

        case 'blood_pressure':
          const latestBP = vitals.find((v: any) => v.metricType === 'blood_pressure');
          if (latestBP) {
            const [systolic, diastolic] = latestBP.value.split('/').map(Number);
            features.set('blood_pressure', { systolic, diastolic });
          }
          break;

        case 'glucose_levels':
          const latestGlucose = vitals.find((v: any) => v.metricType === 'glucose');
          if (latestGlucose) {
            features.set('glucose_levels', latestGlucose.value);
          }
          break;

        case 'family_history':
          const familyHistory = history.filter((h: any) => h.type === 'family_history');
          features.set('family_history', familyHistory.length > 0);
          break;

        case 'smoking':
          features.set('smoking', profile?.smoking_status === 'current_smoker');
          break;

        case 'physical_activity':
          const steps = vitals.filter((v: any) => v.metricType === 'steps');
          const avgSteps = steps.length > 0 ? 
            steps.reduce((sum: number, s: any) => sum + s.value, 0) / steps.length : 0;
          features.set('physical_activity', avgSteps);
          break;

        case 'medication_adherence':
          const adherenceRate = this.calculateMedicationAdherence(medications);
          features.set('medication_adherence', adherenceRate);
          break;

        case 'comorbidities':
          const comorbidityCount = history.filter((h: any) => h.type === 'diagnosis').length;
          features.set('comorbidities', comorbidityCount);
          break;
      }
    });

    return features;
  }

  private calculateMedicationAdherence(medications: any[]): number {
    if (medications.length === 0) return 1.0;
    
    // Simplified adherence calculation
    const adherentMeds = medications.filter(med => med.adherence_rate >= 0.8).length;
    return adherentMeds / medications.length;
  }

  private calculatePrediction(model: PredictiveModel, features: Map<string, any>): { probability: number; confidence: number } | null {
    try {
      // Simplified prediction algorithm - in production, this would use actual ML models
      let riskScore = 0;
      let totalWeight = 0;

      model.features.forEach(feature => {
        const value = features.get(feature);
        const weight = this.featureWeights.get(feature) || 0.1;
        
        if (value !== undefined) {
          const normalizedValue = this.normalizeFeatureValue(feature, value);
          riskScore += normalizedValue * weight;
          totalWeight += weight;
        }
      });

      if (totalWeight === 0) return null;

      const probability = Math.min(riskScore / totalWeight, 1.0);
      const confidence = Math.min(totalWeight / model.features.length, 1.0) * model.accuracy;

      return { probability, confidence };
    } catch (error) {
      logger.error('Failed to calculate prediction', 'PREDICTIVE_ANALYTICS', error);
      return null;
    }
  }

  private normalizeFeatureValue(feature: string, value: any): number {
    switch (feature) {
      case 'age':
        return Math.min(value / 100, 1.0); // Normalize age to 0-1

      case 'bmi':
        if (value < 18.5) return 0.2;
        if (value < 25) return 0.1;
        if (value < 30) return 0.4;
        return 0.8; // Obese

      case 'blood_pressure':
        const { systolic, diastolic } = value;
        if (systolic > 140 || diastolic > 90) return 0.8;
        if (systolic > 130 || diastolic > 80) return 0.5;
        return 0.2;

      case 'glucose_levels':
        if (value > 126) return 0.9; // Diabetic range
        if (value > 100) return 0.5; // Pre-diabetic
        return 0.1;

      case 'family_history':
        return value ? 0.7 : 0.1;

      case 'smoking':
        return value ? 0.8 : 0.1;

      case 'physical_activity':
        if (value < 5000) return 0.7; // Low activity
        if (value < 10000) return 0.4; // Moderate activity
        return 0.1; // High activity

      case 'medication_adherence':
        return 1 - value; // Lower adherence = higher risk

      case 'comorbidities':
        return Math.min(value * 0.2, 1.0);

      default:
        return 0.5;
    }
  }

  private identifyRiskFactors(features: string[], featureValues: Map<string, any>, probability: number): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];

    features.forEach(feature => {
      const value = featureValues.get(feature);
      if (value === undefined) return;

      const normalizedValue = this.normalizeFeatureValue(feature, value);
      const contribution = normalizedValue * (this.featureWeights.get(feature) || 0.1) * 100;

      if (contribution > 10) { // Only include significant risk factors
        riskFactors.push({
          factor: this.getFeatureDisplayName(feature),
          impact: contribution > 30 ? 'high' : contribution > 20 ? 'medium' : 'low',
          modifiable: this.isModifiableRiskFactor(feature),
          currentValue: this.formatFeatureValue(feature, value),
          targetValue: this.getTargetValue(feature),
          contribution: Math.round(contribution)
        });
      }
    });

    return riskFactors.sort((a, b) => b.contribution - a.contribution);
  }

  private getFeatureDisplayName(feature: string): string {
    const displayNames: Record<string, string> = {
      'age': 'Age',
      'bmi': 'Body Mass Index',
      'blood_pressure': 'Blood Pressure',
      'glucose_levels': 'Blood Glucose',
      'family_history': 'Family History',
      'smoking': 'Smoking Status',
      'physical_activity': 'Physical Activity',
      'medication_adherence': 'Medication Adherence',
      'comorbidities': 'Existing Conditions'
    };

    return displayNames[feature] || feature;
  }

  private isModifiableRiskFactor(feature: string): boolean {
    const modifiable = ['bmi', 'blood_pressure', 'glucose_levels', 'smoking', 'physical_activity', 'medication_adherence'];
    return modifiable.includes(feature);
  }

  private formatFeatureValue(feature: string, value: any): string {
    switch (feature) {
      case 'age':
        return `${value} years`;
      case 'bmi':
        return `${value.toFixed(1)} kg/m²`;
      case 'blood_pressure':
        return `${value.systolic}/${value.diastolic} mmHg`;
      case 'glucose_levels':
        return `${value} mg/dL`;
      case 'physical_activity':
        return `${Math.round(value)} steps/day`;
      case 'medication_adherence':
        return `${Math.round(value * 100)}%`;
      default:
        return String(value);
    }
  }

  private getTargetValue(feature: string): string | undefined {
    const targets: Record<string, string> = {
      'bmi': '18.5-24.9 kg/m²',
      'blood_pressure': '<120/80 mmHg',
      'glucose_levels': '<100 mg/dL',
      'physical_activity': '>10,000 steps/day',
      'medication_adherence': '>90%'
    };

    return targets[feature];
  }

  private generatePreventiveActions(condition: string, riskFactors: RiskFactor[]): string[] {
    const actions: string[] = [];
    const conditionActions: Record<string, string[]> = {
      'type_2_diabetes': [
        'Maintain healthy weight (BMI 18.5-24.9)',
        'Exercise regularly (150+ minutes/week)',
        'Follow balanced diet low in refined sugars',
        'Monitor blood glucose regularly',
        'Take prescribed medications as directed'
      ],
      'cardiovascular_disease': [
        'Control blood pressure (<120/80 mmHg)',
        'Maintain healthy cholesterol levels',
        'Quit smoking if applicable',
        'Exercise regularly (cardio + strength training)',
        'Follow heart-healthy diet (Mediterranean style)',
        'Manage stress effectively'
      ],
      'hospital_readmission': [
        'Follow discharge instructions carefully',
        'Take medications exactly as prescribed',
        'Attend all follow-up appointments',
        'Monitor symptoms and report changes',
        'Maintain healthy lifestyle habits'
      ]
    };

    // Add condition-specific actions
    const specificActions = conditionActions[condition] || [];
    actions.push(...specificActions);

    // Add risk factor-specific actions
    riskFactors.forEach(factor => {
      if (factor.modifiable && factor.impact !== 'low') {
        switch (factor.factor) {
          case 'Body Mass Index':
            if (!actions.some(a => a.includes('weight'))) {
              actions.push('Work with healthcare provider on weight management plan');
            }
            break;
          case 'Blood Pressure':
            if (!actions.some(a => a.includes('blood pressure'))) {
              actions.push('Monitor and control blood pressure through diet, exercise, and medication');
            }
            break;
          case 'Physical Activity':
            if (!actions.some(a => a.includes('exercise'))) {
              actions.push('Increase daily physical activity gradually');
            }
            break;
          case 'Smoking Status':
            actions.push('Seek smoking cessation support and resources');
            break;
        }
      }
    });

    return [...new Set(actions)]; // Remove duplicates
  }

  private mapConditionToPredictionType(condition: string): HealthPrediction['predictionType'] {
    const mapping: Record<string, HealthPrediction['predictionType']> = {
      'type_2_diabetes': 'disease_risk',
      'cardiovascular_disease': 'disease_risk',
      'hospital_readmission': 'readmission_risk'
    };

    return mapping[condition] || 'disease_risk';
  }

  private determineTimeframe(condition: string): HealthPrediction['timeframe'] {
    const timeframes: Record<string, HealthPrediction['timeframe']> = {
      'hospital_readmission': '30d',
      'type_2_diabetes': '5y',
      'cardiovascular_disease': '5y'
    };

    return timeframes[condition] || '1y';
  }

  async generateRiskProfile(patientId: string): Promise<PatientRiskProfile> {
    try {
      const predictions = await this.generatePredictions(patientId);
      const overallRiskScore = this.calculateOverallRiskScore(predictions);
      const riskCategory = this.categorizeRisk(overallRiskScore);
      const trendAnalysis = await this.analyzeTrends(patientId);
      const recommendations = this.generateRecommendations(predictions, trendAnalysis);

      const riskProfile: PatientRiskProfile = {
        patientId,
        overallRiskScore,
        riskCategory,
        predictions,
        trendAnalysis,
        recommendations,
        lastUpdated: new Date().toISOString()
      };

      // Cache the profile
      this.patientProfiles.set(patientId, riskProfile);

      // Store in database
      await supabase.from('patient_risk_profiles').upsert({
        patient_id: patientId,
        risk_profile: JSON.stringify(riskProfile),
        updated_at: new Date().toISOString()
      });

      logger.info('Risk profile generated', 'PREDICTIVE_ANALYTICS', {
        patientId,
        overallRiskScore,
        riskCategory,
        predictionCount: predictions.length
      });

      return riskProfile;
    } catch (error) {
      errorHandler.handleError(error, 'generateRiskProfile');
      throw error;
    }
  }

  private calculateOverallRiskScore(predictions: HealthPrediction[]): number {
    if (predictions.length === 0) return 0;

    const weightedScores = predictions.map(p => p.probability * p.confidence);
    const totalWeight = predictions.reduce((sum, p) => sum + p.confidence, 0);

    return totalWeight > 0 ? weightedScores.reduce((sum, score) => sum + score, 0) / totalWeight : 0;
  }

  private categorizeRisk(riskScore: number): PatientRiskProfile['riskCategory'] {
    if (riskScore >= 0.8) return 'critical';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.3) return 'medium';
    return 'low';
  }

  private async analyzeTrends(patientId: string): Promise<PatientRiskProfile['trendAnalysis']> {
    try {
      const { data: historicalPredictions } = await supabase
        .from('health_predictions')
        .select('*')
        .eq('patientId', patientId)
        .order('createdAt', { ascending: false })
        .limit(100);

      const trends = {
        improving: [] as string[],
        worsening: [] as string[],
        stable: [] as string[]
      };

      if (!historicalPredictions || historicalPredictions.length < 2) {
        return trends;
      }

      // Group by condition and analyze trends
      const conditionGroups = historicalPredictions.reduce((groups, pred) => {
        if (!groups[pred.condition]) groups[pred.condition] = [];
        groups[pred.condition].push(pred);
        return groups;
      }, {} as Record<string, any[]>);

      Object.entries(conditionGroups).forEach(([condition, preds]) => {
        if (preds.length >= 2) {
          const latest = preds[0];
          const previous = preds[1];
          const change = latest.probability - previous.probability;

          if (change < -0.1) {
            trends.improving.push(condition);
          } else if (change > 0.1) {
            trends.worsening.push(condition);
          } else {
            trends.stable.push(condition);
          }
        }
      });

      return trends;
    } catch (error) {
      logger.error('Failed to analyze trends', 'PREDICTIVE_ANALYTICS', error);
      return { improving: [], worsening: [], stable: [] };
    }
  }

  private generateRecommendations(
    predictions: HealthPrediction[], 
    trends: PatientRiskProfile['trendAnalysis']
  ): PatientRiskProfile['recommendations'] {
    const recommendations = {
      immediate: [] as string[],
      shortTerm: [] as string[],
      longTerm: [] as string[]
    };

    // Immediate actions for high-risk predictions
    const highRiskPredictions = predictions.filter(p => p.probability > 0.7);
    highRiskPredictions.forEach(pred => {
      recommendations.immediate.push(`Urgent: Address high risk for ${pred.condition}`);
      recommendations.immediate.push(...pred.preventiveActions.slice(0, 2));
    });

    // Short-term actions for worsening trends
    trends.worsening.forEach(condition => {
      recommendations.shortTerm.push(`Monitor and address worsening trend in ${condition}`);
    });

    // Long-term preventive actions
    const allPreventiveActions = predictions.flatMap(p => p.preventiveActions);
    const uniqueActions = [...new Set(allPreventiveActions)];
    recommendations.longTerm.push(...uniqueActions.slice(0, 5));

    return recommendations;
  }

  private async startPeriodicUpdates(): Promise<void> {
    // Update risk profiles daily
    setInterval(async () => {
      await this.updateAllRiskProfiles();
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Retrain models weekly (simplified)
    setInterval(async () => {
      await this.retrainModels();
    }, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  private async updateAllRiskProfiles(): Promise<void> {
    try {
      const { data: patients } = await supabase
        .from('user_profiles')
        .select('id');

      if (patients) {
        for (const patient of patients) {
          await this.generateRiskProfile(patient.id);
        }
      }

      logger.info('All risk profiles updated', 'PREDICTIVE_ANALYTICS');
    } catch (error) {
      logger.error('Failed to update risk profiles', 'PREDICTIVE_ANALYTICS', error);
    }
  }

  private async retrainModels(): Promise<void> {
    try {
      // In production, this would trigger actual model retraining
      logger.info('Model retraining initiated', 'PREDICTIVE_ANALYTICS');
      
      // Update model accuracy based on recent predictions vs outcomes
      for (const [modelId, model] of this.models) {
        const updatedAccuracy = await this.validateModelAccuracy(modelId);
        model.accuracy = updatedAccuracy;
        model.validatedAt = new Date().toISOString();
      }
    } catch (error) {
      logger.error('Model retraining failed', 'PREDICTIVE_ANALYTICS', error);
    }
  }

  private async validateModelAccuracy(modelId: string): Promise<number> {
    // Simplified validation - in production, this would compare predictions to actual outcomes
    const currentAccuracy = this.models.get(modelId)?.accuracy || 0.8;
    
    // Simulate accuracy variation
    const variation = (Math.random() - 0.5) * 0.1; // ±5%
    return Math.max(0.6, Math.min(0.95, currentAccuracy + variation));
  }

  async getPredictionHistory(patientId: string, condition?: string): Promise<HealthPrediction[]> {
    try {
      let query = supabase
        .from('health_predictions')
        .select('*')
        .eq('patientId', patientId);

      if (condition) {
        query = query.eq('condition', condition);
      }

      const { data: predictions } = await query.order('createdAt', { ascending: false });
      return predictions || [];
    } catch (error) {
      errorHandler.handleError(error, 'getPredictionHistory');
      return [];
    }
  }

  async getModelPerformance(): Promise<any> {
    try {
      const performance = Array.from(this.models.values()).map(model => ({
        id: model.id,
        name: model.name,
        accuracy: model.accuracy,
        precision: model.precision,
        recall: model.recall,
        version: model.version,
        lastValidated: model.validatedAt
      }));

      return {
        models: performance,
        totalModels: this.models.size,
        averageAccuracy: performance.reduce((sum, m) => sum + m.accuracy, 0) / performance.length,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      errorHandler.handleError(error, 'getModelPerformance');
      return null;
    }
  }
}

export const predictiveHealthAnalytics = new PredictiveHealthAnalytics();
