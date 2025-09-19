import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { errorHandler } from './error-handler';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface HealthInsight {
  id: string;
  type: 'risk_assessment' | 'recommendation' | 'trend_analysis' | 'preventive_care' | 'medication_optimization';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  actionable: boolean;
  recommendations: string[];
  dataPoints: string[];
  generatedAt: Date;
  expiresAt?: Date;
}

export interface HealthTrend {
  metric: string;
  trend: 'improving' | 'stable' | 'declining' | 'critical';
  changePercent: number;
  timeframe: string;
  predictions: {
    shortTerm: string;
    longTerm: string;
  };
}

export interface RiskFactor {
  factor: string;
  riskLevel: number;
  impact: 'low' | 'medium' | 'high';
  modifiable: boolean;
  recommendations: string[];
}

export interface HealthScore {
  overall: number;
  categories: {
    cardiovascular: number;
    metabolic: number;
    mental: number;
    lifestyle: number;
    preventive: number;
  };
  trends: HealthTrend[];
  riskFactors: RiskFactor[];
}

class AIHealthInsights {
  private insightsCache: Map<string, HealthInsight[]> = new Map();
  private cacheExpiry: number = 3600000; // 1 hour

  async generateHealthInsights(userId: string): Promise<HealthInsight[]> {
    try {
      // Check cache
      const cached = this.insightsCache.get(userId);
      if (cached) {
        return cached;
      }

      logger.info('Generating AI health insights', 'AI_HEALTH', { userId });

      // Get user health data
      const healthData = await this.getUserHealthData(userId);
      
      // Generate insights
      const insights: HealthInsight[] = [];
      
      // Risk assessment insights
      const riskInsights = await this.generateRiskAssessments(healthData);
      insights.push(...riskInsights);
      
      // Trend analysis insights
      const trendInsights = await this.generateTrendAnalysis(healthData);
      insights.push(...trendInsights);
      
      // Preventive care insights
      const preventiveInsights = await this.generatePreventiveCareInsights(healthData);
      insights.push(...preventiveInsights);
      
      // Medication optimization
      const medicationInsights = await this.generateMedicationInsights(healthData);
      insights.push(...medicationInsights);

      // Cache results
      this.insightsCache.set(userId, insights);
      setTimeout(() => this.insightsCache.delete(userId), this.cacheExpiry);

      logger.info(`Generated ${insights.length} health insights`, 'AI_HEALTH', { userId });
      return insights;
    } catch (error) {
      errorHandler.handleError(error, 'generateHealthInsights');
      return [];
    }
  }

  private async getUserHealthData(userId: string): Promise<any> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data: vitals } = await supabase
        .from('health_vitals')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(30);

      const { data: medications } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true);

      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', userId)
        .order('appointment_date', { ascending: false })
        .limit(10);

      return {
        profile,
        vitals: vitals || [],
        medications: medications || [],
        appointments: appointments || []
      };
    } catch (error) {
      logger.error('Failed to get user health data', 'AI_HEALTH', error);
      return { profile: null, vitals: [], medications: [], appointments: [] };
    }
  }

  private async generateRiskAssessments(healthData: any): Promise<HealthInsight[]> {
    const insights: HealthInsight[] = [];
    
    try {
      const { profile, vitals } = healthData;
      
      if (!profile || vitals.length === 0) return insights;

      // Cardiovascular risk assessment
      const cvRisk = this.assessCardiovascularRisk(profile, vitals);
      if (cvRisk.riskLevel > 0.3) {
        insights.push({
          id: `cv-risk-${Date.now()}`,
          type: 'risk_assessment',
          title: 'Cardiovascular Risk Assessment',
          description: `Based on your health data, you have a ${Math.round(cvRisk.riskLevel * 100)}% elevated cardiovascular risk.`,
          severity: cvRisk.riskLevel > 0.7 ? 'high' : cvRisk.riskLevel > 0.5 ? 'medium' : 'low',
          confidence: 0.85,
          actionable: true,
          recommendations: cvRisk.recommendations,
          dataPoints: cvRisk.dataPoints,
          generatedAt: new Date()
        });
      }

      // Diabetes risk assessment
      const diabetesRisk = this.assessDiabetesRisk(profile, vitals);
      if (diabetesRisk.riskLevel > 0.25) {
        insights.push({
          id: `diabetes-risk-${Date.now()}`,
          type: 'risk_assessment',
          title: 'Type 2 Diabetes Risk',
          description: `Your current health indicators suggest a ${Math.round(diabetesRisk.riskLevel * 100)}% risk for developing Type 2 diabetes.`,
          severity: diabetesRisk.riskLevel > 0.6 ? 'high' : 'medium',
          confidence: 0.78,
          actionable: true,
          recommendations: diabetesRisk.recommendations,
          dataPoints: diabetesRisk.dataPoints,
          generatedAt: new Date()
        });
      }

    } catch (error) {
      logger.error('Error generating risk assessments', 'AI_HEALTH', error);
    }

    return insights;
  }

  private assessCardiovascularRisk(profile: any, vitals: any[]): any {
    const latestVitals = vitals[0] || {};
    const age = profile.age || 30;
    const gender = profile.gender || 'unknown';
    
    let riskScore = 0;
    const dataPoints: string[] = [];
    const recommendations: string[] = [];

    // Age factor
    if (age > 65) riskScore += 0.3;
    else if (age > 45) riskScore += 0.15;

    // Blood pressure
    const systolic = latestVitals.systolic_bp || 120;
    const diastolic = latestVitals.diastolic_bp || 80;
    
    if (systolic > 140 || diastolic > 90) {
      riskScore += 0.25;
      dataPoints.push(`High blood pressure: ${systolic}/${diastolic} mmHg`);
      recommendations.push('Monitor blood pressure regularly and consider lifestyle modifications');
    }

    // Cholesterol (simulated)
    const cholesterol = latestVitals.cholesterol || 180;
    if (cholesterol > 240) {
      riskScore += 0.2;
      dataPoints.push(`High cholesterol: ${cholesterol} mg/dL`);
      recommendations.push('Consider dietary changes to reduce cholesterol levels');
    }

    // BMI
    const bmi = latestVitals.bmi || 25;
    if (bmi > 30) {
      riskScore += 0.15;
      dataPoints.push(`BMI: ${bmi} (Obese)`);
      recommendations.push('Weight management through diet and exercise');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue maintaining healthy lifestyle habits');
    }

    return {
      riskLevel: Math.min(riskScore, 1.0),
      dataPoints,
      recommendations
    };
  }

  private assessDiabetesRisk(profile: any, vitals: any[]): any {
    const latestVitals = vitals[0] || {};
    let riskScore = 0;
    const dataPoints: string[] = [];
    const recommendations: string[] = [];

    // Age factor
    const age = profile.age || 30;
    if (age > 45) riskScore += 0.2;

    // BMI
    const bmi = latestVitals.bmi || 25;
    if (bmi > 25) {
      riskScore += bmi > 30 ? 0.3 : 0.15;
      dataPoints.push(`BMI: ${bmi}`);
    }

    // Blood glucose (simulated)
    const glucose = latestVitals.glucose || 90;
    if (glucose > 100) {
      riskScore += glucose > 125 ? 0.4 : 0.2;
      dataPoints.push(`Fasting glucose: ${glucose} mg/dL`);
      recommendations.push('Monitor blood sugar levels and consider dietary modifications');
    }

    // Family history (from profile)
    if (profile.family_history_diabetes) {
      riskScore += 0.15;
      dataPoints.push('Family history of diabetes');
    }

    if (riskScore > 0.25) {
      recommendations.push('Regular screening for diabetes');
      recommendations.push('Maintain healthy weight and exercise regularly');
    }

    return {
      riskLevel: Math.min(riskScore, 1.0),
      dataPoints,
      recommendations
    };
  }

  private async generateTrendAnalysis(healthData: any): Promise<HealthInsight[]> {
    const insights: HealthInsight[] = [];
    
    try {
      const { vitals } = healthData;
      
      if (vitals.length < 3) return insights;

      // Weight trend analysis
      const weightTrend = this.analyzeTrend(vitals, 'weight');
      if (weightTrend.significance > 0.7) {
        insights.push({
          id: `weight-trend-${Date.now()}`,
          type: 'trend_analysis',
          title: 'Weight Trend Analysis',
          description: `Your weight has been ${weightTrend.direction} by ${Math.abs(weightTrend.change)}% over the past ${weightTrend.timeframe}.`,
          severity: Math.abs(weightTrend.change) > 10 ? 'medium' : 'low',
          confidence: weightTrend.significance,
          actionable: true,
          recommendations: this.getWeightRecommendations(weightTrend),
          dataPoints: [`Weight change: ${weightTrend.change}%`, `Trend: ${weightTrend.direction}`],
          generatedAt: new Date()
        });
      }

      // Blood pressure trend
      const bpTrend = this.analyzeTrend(vitals, 'systolic_bp');
      if (bpTrend.significance > 0.6) {
        insights.push({
          id: `bp-trend-${Date.now()}`,
          type: 'trend_analysis',
          title: 'Blood Pressure Trend',
          description: `Your blood pressure has been ${bpTrend.direction} over recent measurements.`,
          severity: bpTrend.direction === 'increasing' && bpTrend.change > 5 ? 'medium' : 'low',
          confidence: bpTrend.significance,
          actionable: true,
          recommendations: this.getBPRecommendations(bpTrend),
          dataPoints: [`BP change: ${bpTrend.change}%`, `Trend: ${bpTrend.direction}`],
          generatedAt: new Date()
        });
      }

    } catch (error) {
      logger.error('Error generating trend analysis', 'AI_HEALTH', error);
    }

    return insights;
  }

  private analyzeTrend(vitals: any[], metric: string): any {
    if (vitals.length < 3) return { significance: 0 };

    const values = vitals.slice(0, 10).map(v => v[metric]).filter(v => v != null);
    if (values.length < 3) return { significance: 0 };

    const recent = values.slice(0, Math.ceil(values.length / 2));
    const older = values.slice(Math.ceil(values.length / 2));

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    const direction = change > 0 ? 'increasing' : 'decreasing';
    
    // Calculate significance based on consistency of trend
    const significance = Math.min(Math.abs(change) / 10, 1.0);

    return {
      change: Math.round(change * 100) / 100,
      direction,
      significance,
      timeframe: `${vitals.length} measurements`
    };
  }

  private getWeightRecommendations(trend: any): string[] {
    const recommendations: string[] = [];
    
    if (trend.direction === 'increasing' && trend.change > 5) {
      recommendations.push('Consider consulting with a nutritionist');
      recommendations.push('Increase physical activity gradually');
      recommendations.push('Monitor portion sizes and eating habits');
    } else if (trend.direction === 'decreasing' && trend.change < -10) {
      recommendations.push('Consult with your healthcare provider about rapid weight loss');
      recommendations.push('Ensure adequate nutrition intake');
    } else {
      recommendations.push('Continue current healthy lifestyle habits');
    }

    return recommendations;
  }

  private getBPRecommendations(trend: any): string[] {
    const recommendations: string[] = [];
    
    if (trend.direction === 'increasing') {
      recommendations.push('Monitor blood pressure more frequently');
      recommendations.push('Reduce sodium intake');
      recommendations.push('Increase physical activity');
      recommendations.push('Consider stress management techniques');
    } else {
      recommendations.push('Continue current blood pressure management');
      recommendations.push('Maintain healthy lifestyle habits');
    }

    return recommendations;
  }

  private async generatePreventiveCareInsights(healthData: any): Promise<HealthInsight[]> {
    const insights: HealthInsight[] = [];
    
    try {
      const { profile, appointments } = healthData;
      
      if (!profile) return insights;

      const age = profile.age || 30;
      const gender = profile.gender || 'unknown';
      const lastCheckup = this.getLastCheckupDate(appointments);

      // Annual checkup reminder
      if (!lastCheckup || this.daysSince(lastCheckup) > 365) {
        insights.push({
          id: `checkup-reminder-${Date.now()}`,
          type: 'preventive_care',
          title: 'Annual Health Checkup Due',
          description: 'It\'s time for your annual health checkup to monitor your overall health.',
          severity: 'medium',
          confidence: 1.0,
          actionable: true,
          recommendations: [
            'Schedule annual physical examination',
            'Update vaccinations if needed',
            'Discuss health goals with your provider'
          ],
          dataPoints: [`Last checkup: ${lastCheckup ? this.daysSince(lastCheckup) + ' days ago' : 'Unknown'}`],
          generatedAt: new Date()
        });
      }

      // Age-specific screenings
      const screenings = this.getAgeAppropriateScreenings(age, gender);
      screenings.forEach(screening => {
        insights.push({
          id: `screening-${screening.type}-${Date.now()}`,
          type: 'preventive_care',
          title: `${screening.name} Screening Recommended`,
          description: screening.description,
          severity: 'low',
          confidence: 0.9,
          actionable: true,
          recommendations: screening.recommendations,
          dataPoints: [`Age: ${age}`, `Gender: ${gender}`],
          generatedAt: new Date()
        });
      });

    } catch (error) {
      logger.error('Error generating preventive care insights', 'AI_HEALTH', error);
    }

    return insights;
  }

  private getLastCheckupDate(appointments: any[]): Date | null {
    const checkups = appointments.filter(apt => 
      apt.type === 'checkup' || apt.type === 'physical' || apt.notes?.includes('annual')
    );
    
    if (checkups.length === 0) return null;
    
    return new Date(checkups[0].appointment_date);
  }

  private daysSince(date: Date): number {
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getAgeAppropriateScreenings(age: number, gender: string): any[] {
    const screenings: any[] = [];

    if (age >= 40) {
      screenings.push({
        type: 'mammogram',
        name: 'Mammogram',
        description: 'Annual mammogram screening for breast cancer detection.',
        recommendations: ['Schedule mammogram with radiology', 'Discuss family history with provider']
      });
    }

    if (age >= 50) {
      screenings.push({
        type: 'colonoscopy',
        name: 'Colonoscopy',
        description: 'Colorectal cancer screening recommended every 10 years.',
        recommendations: ['Schedule colonoscopy screening', 'Follow prep instructions carefully']
      });
    }

    if (age >= 65) {
      screenings.push({
        type: 'bone_density',
        name: 'Bone Density Scan',
        description: 'DEXA scan to assess bone health and osteoporosis risk.',
        recommendations: ['Schedule DEXA scan', 'Discuss calcium and vitamin D intake']
      });
    }

    return screenings;
  }

  private async generateMedicationInsights(healthData: any): Promise<HealthInsight[]> {
    const insights: HealthInsight[] = [];
    
    try {
      const { medications, vitals } = healthData;
      
      if (!medications || medications.length === 0) return insights;

      // Medication adherence analysis
      const adherenceIssues = this.analyzeMedicationAdherence(medications);
      if (adherenceIssues.length > 0) {
        insights.push({
          id: `med-adherence-${Date.now()}`,
          type: 'medication_optimization',
          title: 'Medication Adherence Optimization',
          description: 'Some medications may need attention for better adherence.',
          severity: 'medium',
          confidence: 0.8,
          actionable: true,
          recommendations: adherenceIssues,
          dataPoints: [`${medications.length} active medications`],
          generatedAt: new Date()
        });
      }

      // Drug interaction check
      const interactions = this.checkDrugInteractions(medications);
      if (interactions.length > 0) {
        insights.push({
          id: `drug-interactions-${Date.now()}`,
          type: 'medication_optimization',
          title: 'Potential Drug Interactions',
          description: 'Some of your medications may have interactions that need review.',
          severity: 'high',
          confidence: 0.9,
          actionable: true,
          recommendations: [
            'Consult with pharmacist about drug interactions',
            'Review medication timing with healthcare provider',
            'Consider medication management consultation'
          ],
          dataPoints: interactions,
          generatedAt: new Date()
        });
      }

    } catch (error) {
      logger.error('Error generating medication insights', 'AI_HEALTH', error);
    }

    return insights;
  }

  private analyzeMedicationAdherence(medications: any[]): string[] {
    const recommendations: string[] = [];
    
    const complexRegimens = medications.filter(med => 
      med.frequency === 'multiple_daily' || med.instructions?.includes('with food')
    );
    
    if (complexRegimens.length > 2) {
      recommendations.push('Consider pill organizer for complex medication schedule');
      recommendations.push('Set medication reminders on your phone');
    }

    if (medications.length > 5) {
      recommendations.push('Request medication review with pharmacist');
      recommendations.push('Ask about combination medications to reduce pill burden');
    }

    return recommendations;
  }

  private checkDrugInteractions(medications: any[]): string[] {
    // Simplified interaction checking - in production, use comprehensive drug database
    const interactions: string[] = [];
    
    const drugNames = medications.map(med => med.name?.toLowerCase() || '');
    
    // Common interaction patterns
    if (drugNames.includes('warfarin') && drugNames.some(name => name.includes('aspirin'))) {
      interactions.push('Warfarin + Aspirin: Increased bleeding risk');
    }
    
    if (drugNames.includes('metformin') && drugNames.includes('furosemide')) {
      interactions.push('Metformin + Furosemide: Monitor kidney function');
    }

    return interactions;
  }

  async calculateHealthScore(userId: string): Promise<HealthScore> {
    try {
      const healthData = await this.getUserHealthData(userId);
      const insights = await this.generateHealthInsights(userId);
      
      // Calculate category scores
      const cardiovascular = this.calculateCardiovascularScore(healthData);
      const metabolic = this.calculateMetabolicScore(healthData);
      const mental = this.calculateMentalHealthScore(healthData);
      const lifestyle = this.calculateLifestyleScore(healthData);
      const preventive = this.calculatePreventiveScore(healthData, insights);
      
      const overall = Math.round(
        (cardiovascular + metabolic + mental + lifestyle + preventive) / 5
      );

      return {
        overall,
        categories: {
          cardiovascular,
          metabolic,
          mental,
          lifestyle,
          preventive
        },
        trends: this.calculateHealthTrends(healthData),
        riskFactors: this.identifyRiskFactors(healthData, insights)
      };
    } catch (error) {
      errorHandler.handleError(error, 'calculateHealthScore');
      return {
        overall: 50,
        categories: {
          cardiovascular: 50,
          metabolic: 50,
          mental: 50,
          lifestyle: 50,
          preventive: 50
        },
        trends: [],
        riskFactors: []
      };
    }
  }

  private calculateCardiovascularScore(healthData: any): number {
    const { vitals } = healthData;
    if (!vitals || vitals.length === 0) return 50;

    const latest = vitals[0];
    let score = 100;

    // Blood pressure scoring
    const systolic = latest.systolic_bp || 120;
    const diastolic = latest.diastolic_bp || 80;
    
    if (systolic > 140 || diastolic > 90) score -= 30;
    else if (systolic > 130 || diastolic > 85) score -= 15;

    // Heart rate scoring
    const heartRate = latest.heart_rate || 70;
    if (heartRate > 100 || heartRate < 50) score -= 10;

    return Math.max(score, 0);
  }

  private calculateMetabolicScore(healthData: any): number {
    const { vitals } = healthData;
    if (!vitals || vitals.length === 0) return 50;

    const latest = vitals[0];
    let score = 100;

    // BMI scoring
    const bmi = latest.bmi || 25;
    if (bmi > 30) score -= 25;
    else if (bmi > 25 || bmi < 18.5) score -= 10;

    // Blood glucose scoring (if available)
    const glucose = latest.glucose;
    if (glucose) {
      if (glucose > 125) score -= 20;
      else if (glucose > 100) score -= 10;
    }

    return Math.max(score, 0);
  }

  private calculateMentalHealthScore(healthData: any): number {
    // Simplified mental health scoring - would integrate with mental health assessments
    return 75; // Placeholder
  }

  private calculateLifestyleScore(healthData: any): number {
    const { profile } = healthData;
    if (!profile) return 50;

    let score = 100;

    // Exercise habits
    if (profile.exercise_frequency === 'never') score -= 30;
    else if (profile.exercise_frequency === 'rarely') score -= 15;

    // Smoking status
    if (profile.smoking_status === 'current') score -= 40;
    else if (profile.smoking_status === 'former') score -= 10;

    return Math.max(score, 0);
  }

  private calculatePreventiveScore(healthData: any, insights: HealthInsight[]): number {
    const preventiveInsights = insights.filter(i => i.type === 'preventive_care');
    const score = Math.max(100 - (preventiveInsights.length * 15), 0);
    return score;
  }

  private calculateHealthTrends(healthData: any): HealthTrend[] {
    // Simplified trend calculation
    return [];
  }

  private identifyRiskFactors(healthData: any, insights: HealthInsight[]): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];
    
    insights.filter(i => i.type === 'risk_assessment').forEach(insight => {
      riskFactors.push({
        factor: insight.title,
        riskLevel: insight.severity === 'high' ? 80 : insight.severity === 'medium' ? 60 : 40,
        impact: insight.severity as 'low' | 'medium' | 'high',
        modifiable: insight.actionable,
        recommendations: insight.recommendations
      });
    });

    return riskFactors;
  }

  clearCache(): void {
    this.insightsCache.clear();
  }
}

export const aiHealthInsights = new AIHealthInsights();
