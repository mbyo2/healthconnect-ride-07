import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { errorHandler } from './error-handler';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface HealthTrend {
  metric: string;
  direction: 'improving' | 'stable' | 'declining';
  changePercent: number;
  significance: 'high' | 'medium' | 'low';
  timeframe: string;
  dataPoints: number;
}

export interface VisualizationConfig {
  chartType: 'line' | 'bar' | 'scatter' | 'heatmap' | 'radar' | 'treemap';
  metrics: string[];
  timeRange: string;
  aggregation: 'daily' | 'weekly' | 'monthly';
  filters: any;
  styling: {
    colors: string[];
    theme: 'light' | 'dark';
    responsive: boolean;
  };
}

export interface HealthDashboard {
  id: string;
  patientId: string;
  name: string;
  widgets: DashboardWidget[];
  layout: any;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'alert' | 'summary' | 'prediction';
  title: string;
  config: VisualizationConfig;
  position: { x: number; y: number; width: number; height: number };
  data?: any;
}

class HealthDataVisualization {
  private dashboards: Map<string, HealthDashboard> = new Map();
  private trendAnalytics: Map<string, HealthTrend[]> = new Map();

  constructor() {
    this.initializeVisualizationSystem();
  }

  private async initializeVisualizationSystem(): Promise<void> {
    try {
      await this.loadDashboards();
      await this.startTrendAnalysis();

      logger.info('Health Data Visualization system initialized', 'VISUALIZATION');
    } catch (error) {
      errorHandler.handleError(error, 'initializeVisualizationSystem');
    }
  }

  private async loadDashboards(): Promise<void> {
    try {
      const { data: dashboards } = await supabase
        .from('health_dashboards')
        .select('*');

      if (dashboards) {
        dashboards.forEach(dashboard => {
          this.dashboards.set(dashboard.id, {
            ...dashboard,
            widgets: JSON.parse(dashboard.widgets || '[]'),
            layout: JSON.parse(dashboard.layout || '{}')
          });
        });
      }

      logger.info(`Loaded ${this.dashboards.size} health dashboards`, 'VISUALIZATION');
    } catch (error) {
      logger.error('Failed to load dashboards', 'VISUALIZATION', error);
    }
  }

  async generateHealthTrends(patientId: string, timeRange: string = '30d'): Promise<HealthTrend[]> {
    try {
      const startDate = this.calculateStartDate(timeRange);
      
      const { data: metrics } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('patientId', patientId)
        .gte('timestamp', startDate)
        .order('timestamp', { ascending: true });

      if (!metrics || metrics.length === 0) {
        return [];
      }

      const trends = this.analyzeTrends(metrics);
      this.trendAnalytics.set(patientId, trends);

      logger.info(`Generated ${trends.length} health trends for patient`, 'VISUALIZATION', {
        patientId,
        timeRange
      });

      return trends;
    } catch (error) {
      errorHandler.handleError(error, 'generateHealthTrends');
      return [];
    }
  }

  private calculateStartDate(timeRange: string): string {
    const now = new Date();
    const ranges: Record<string, number> = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000
    };

    const milliseconds = ranges[timeRange] || ranges['30d'];
    return new Date(now.getTime() - milliseconds).toISOString();
  }

  private analyzeTrends(metrics: any[]): HealthTrend[] {
    const trends: HealthTrend[] = [];
    const metricGroups = this.groupMetricsByType(metrics);

    Object.entries(metricGroups).forEach(([metricType, values]) => {
      if (values.length < 3) return; // Need minimum data points

      const trend = this.calculateTrend(metricType, values);
      if (trend) {
        trends.push(trend);
      }
    });

    return trends;
  }

  private groupMetricsByType(metrics: any[]): Record<string, any[]> {
    return metrics.reduce((groups, metric) => {
      if (!groups[metric.metricType]) {
        groups[metric.metricType] = [];
      }
      groups[metric.metricType].push(metric);
      return groups;
    }, {} as Record<string, any[]>);
  }

  private calculateTrend(metricType: string, values: any[]): HealthTrend | null {
    try {
      const numericValues = values
        .filter(v => typeof v.value === 'number')
        .map(v => ({ value: v.value, timestamp: new Date(v.timestamp).getTime() }))
        .sort((a, b) => a.timestamp - b.timestamp);

      if (numericValues.length < 3) return null;

      // Linear regression for trend calculation
      const { slope, correlation } = this.linearRegression(numericValues);
      
      const firstValue = numericValues[0].value;
      const lastValue = numericValues[numericValues.length - 1].value;
      const changePercent = ((lastValue - firstValue) / firstValue) * 100;

      let direction: HealthTrend['direction'];
      if (Math.abs(changePercent) < 5) {
        direction = 'stable';
      } else if (this.isImprovingMetric(metricType, slope)) {
        direction = 'improving';
      } else {
        direction = 'declining';
      }

      const significance = this.calculateSignificance(Math.abs(correlation), numericValues.length);

      return {
        metric: metricType,
        direction,
        changePercent: Math.round(changePercent * 100) / 100,
        significance,
        timeframe: `${numericValues.length} data points`,
        dataPoints: numericValues.length
      };
    } catch (error) {
      logger.error('Failed to calculate trend', 'VISUALIZATION', error);
      return null;
    }
  }

  private linearRegression(points: { value: number; timestamp: number }[]): { slope: number; correlation: number } {
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.timestamp, 0);
    const sumY = points.reduce((sum, p) => sum + p.value, 0);
    const sumXY = points.reduce((sum, p) => sum + p.timestamp * p.value, 0);
    const sumXX = points.reduce((sum, p) => sum + p.timestamp * p.timestamp, 0);
    const sumYY = points.reduce((sum, p) => sum + p.value * p.value, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return { slope, correlation };
  }

  private isImprovingMetric(metricType: string, slope: number): boolean {
    const improvingMetrics = ['steps', 'exercise_duration', 'sleep_quality'];
    const decliningMetrics = ['blood_pressure', 'weight', 'glucose', 'pain_level'];

    if (improvingMetrics.includes(metricType)) {
      return slope > 0;
    } else if (decliningMetrics.includes(metricType)) {
      return slope < 0;
    }

    return slope > 0; // Default assumption
  }

  private calculateSignificance(correlation: number, dataPoints: number): HealthTrend['significance'] {
    const absCorrelation = Math.abs(correlation);
    
    if (absCorrelation > 0.7 && dataPoints > 10) return 'high';
    if (absCorrelation > 0.5 && dataPoints > 5) return 'medium';
    return 'low';
  }

  async createDashboard(
    patientId: string,
    name: string,
    widgets: DashboardWidget[],
    isPublic: boolean = false
  ): Promise<HealthDashboard> {
    try {
      const dashboard: HealthDashboard = {
        id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        patientId,
        name,
        widgets,
        layout: this.generateDefaultLayout(widgets),
        isPublic,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await supabase.from('health_dashboards').insert({
        ...dashboard,
        widgets: JSON.stringify(widgets),
        layout: JSON.stringify(dashboard.layout)
      });

      this.dashboards.set(dashboard.id, dashboard);

      logger.info('Health dashboard created', 'VISUALIZATION', {
        dashboardId: dashboard.id,
        patientId,
        widgetCount: widgets.length
      });

      return dashboard;
    } catch (error) {
      errorHandler.handleError(error, 'createDashboard');
      throw error;
    }
  }

  private generateDefaultLayout(widgets: DashboardWidget[]): any {
    const layout = {
      cols: 12,
      rows: Math.ceil(widgets.length / 2),
      widgets: widgets.map((widget, index) => ({
        id: widget.id,
        x: (index % 2) * 6,
        y: Math.floor(index / 2) * 4,
        w: 6,
        h: 4
      }))
    };

    return layout;
  }

  async generateVisualizationData(config: VisualizationConfig, patientId: string): Promise<any> {
    try {
      const startDate = this.calculateStartDate(config.timeRange);
      
      let query = supabase
        .from('health_metrics')
        .select('*')
        .eq('patientId', patientId)
        .gte('timestamp', startDate);

      if (config.metrics.length > 0) {
        query = query.in('metricType', config.metrics);
      }

      const { data: rawData } = await query.order('timestamp', { ascending: true });

      if (!rawData || rawData.length === 0) {
        return { datasets: [], labels: [] };
      }

      const processedData = this.processDataForVisualization(rawData, config);
      return processedData;
    } catch (error) {
      errorHandler.handleError(error, 'generateVisualizationData');
      return { datasets: [], labels: [] };
    }
  }

  private processDataForVisualization(data: any[], config: VisualizationConfig): any {
    switch (config.chartType) {
      case 'line':
        return this.processLineChartData(data, config);
      case 'bar':
        return this.processBarChartData(data, config);
      case 'scatter':
        return this.processScatterChartData(data, config);
      case 'heatmap':
        return this.processHeatmapData(data, config);
      case 'radar':
        return this.processRadarChartData(data, config);
      default:
        return this.processLineChartData(data, config);
    }
  }

  private processLineChartData(data: any[], config: VisualizationConfig): any {
    const metricGroups = this.groupMetricsByType(data);
    const datasets = [];
    const allTimestamps = new Set<string>();

    // Collect all timestamps for consistent x-axis
    data.forEach(item => {
      const date = this.aggregateDate(item.timestamp, config.aggregation);
      allTimestamps.add(date);
    });

    const labels = Array.from(allTimestamps).sort();

    Object.entries(metricGroups).forEach(([metric, values], index) => {
      const aggregatedData = this.aggregateData(values, config.aggregation);
      
      datasets.push({
        label: this.formatMetricName(metric),
        data: labels.map(label => {
          const point = aggregatedData.find(d => d.date === label);
          return point ? point.value : null;
        }),
        borderColor: config.styling.colors[index % config.styling.colors.length],
        backgroundColor: config.styling.colors[index % config.styling.colors.length] + '20',
        tension: 0.4
      });
    });

    return { datasets, labels };
  }

  private processBarChartData(data: any[], config: VisualizationConfig): any {
    const metricGroups = this.groupMetricsByType(data);
    const datasets = [];
    const labels = Object.keys(metricGroups).map(this.formatMetricName);

    const averages = Object.entries(metricGroups).map(([metric, values]) => {
      const numericValues = values.filter(v => typeof v.value === 'number');
      return numericValues.reduce((sum, v) => sum + v.value, 0) / numericValues.length;
    });

    datasets.push({
      label: 'Average Values',
      data: averages,
      backgroundColor: config.styling.colors
    });

    return { datasets, labels };
  }

  private processScatterChartData(data: any[], config: VisualizationConfig): any {
    if (config.metrics.length < 2) {
      return { datasets: [], labels: [] };
    }

    const [xMetric, yMetric] = config.metrics;
    const xData = data.filter(d => d.metricType === xMetric);
    const yData = data.filter(d => d.metricType === yMetric);

    const scatterPoints = xData.map(xPoint => {
      const yPoint = yData.find(y => 
        Math.abs(new Date(y.timestamp).getTime() - new Date(xPoint.timestamp).getTime()) < 3600000
      );
      
      return yPoint ? { x: xPoint.value, y: yPoint.value } : null;
    }).filter(point => point !== null);

    return {
      datasets: [{
        label: `${this.formatMetricName(xMetric)} vs ${this.formatMetricName(yMetric)}`,
        data: scatterPoints,
        backgroundColor: config.styling.colors[0]
      }],
      labels: []
    };
  }

  private processHeatmapData(data: any[], config: VisualizationConfig): any {
    // Group by hour of day and day of week
    const heatmapData = Array(24).fill(null).map(() => Array(7).fill(0));
    const counts = Array(24).fill(null).map(() => Array(7).fill(0));

    data.forEach(item => {
      const date = new Date(item.timestamp);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      
      if (typeof item.value === 'number') {
        heatmapData[hour][dayOfWeek] += item.value;
        counts[hour][dayOfWeek]++;
      }
    });

    // Calculate averages
    for (let h = 0; h < 24; h++) {
      for (let d = 0; d < 7; d++) {
        if (counts[h][d] > 0) {
          heatmapData[h][d] = heatmapData[h][d] / counts[h][d];
        }
      }
    }

    return {
      data: heatmapData,
      xLabels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      yLabels: Array.from({ length: 24 }, (_, i) => `${i}:00`)
    };
  }

  private processRadarChartData(data: any[], config: VisualizationConfig): any {
    const metricGroups = this.groupMetricsByType(data);
    const labels = Object.keys(metricGroups).map(this.formatMetricName);
    
    const normalizedValues = Object.entries(metricGroups).map(([metric, values]) => {
      const numericValues = values.filter(v => typeof v.value === 'number').map(v => v.value);
      const avg = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
      
      // Normalize to 0-100 scale (simplified)
      return Math.min(100, Math.max(0, (avg / this.getMetricMaxValue(metric)) * 100));
    });

    return {
      datasets: [{
        label: 'Health Metrics',
        data: normalizedValues,
        backgroundColor: config.styling.colors[0] + '40',
        borderColor: config.styling.colors[0]
      }],
      labels
    };
  }

  private aggregateData(values: any[], aggregation: string): any[] {
    const groups = new Map<string, number[]>();

    values.forEach(item => {
      if (typeof item.value !== 'number') return;
      
      const date = this.aggregateDate(item.timestamp, aggregation);
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(item.value);
    });

    return Array.from(groups.entries()).map(([date, vals]) => ({
      date,
      value: vals.reduce((sum, v) => sum + v, 0) / vals.length
    }));
  }

  private aggregateDate(timestamp: string, aggregation: string): string {
    const date = new Date(timestamp);
    
    switch (aggregation) {
      case 'daily':
        return date.toISOString().split('T')[0];
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  private formatMetricName(metric: string): string {
    return metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private getMetricMaxValue(metric: string): number {
    const maxValues: Record<string, number> = {
      'heart_rate': 200,
      'blood_pressure': 200,
      'temperature': 42,
      'glucose': 400,
      'weight': 200,
      'steps': 20000,
      'sleep_hours': 12
    };

    return maxValues[metric] || 100;
  }

  async generateHealthSummaryReport(patientId: string, timeRange: string = '30d'): Promise<any> {
    try {
      const trends = await this.generateHealthTrends(patientId, timeRange);
      const startDate = this.calculateStartDate(timeRange);

      const { data: metrics } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('patientId', patientId)
        .gte('timestamp', startDate);

      const { data: alerts } = await supabase
        .from('health_alerts')
        .select('*')
        .eq('patientId', patientId)
        .gte('timestamp', startDate);

      const summary = {
        patientId,
        timeRange,
        generatedAt: new Date().toISOString(),
        metrics: {
          total: metrics?.length || 0,
          types: [...new Set(metrics?.map(m => m.metricType) || [])].length
        },
        trends: {
          improving: trends.filter(t => t.direction === 'improving').length,
          stable: trends.filter(t => t.direction === 'stable').length,
          declining: trends.filter(t => t.direction === 'declining').length
        },
        alerts: {
          total: alerts?.length || 0,
          critical: alerts?.filter(a => a.type === 'critical').length || 0
        },
        keyInsights: this.generateKeyInsights(trends, alerts || []),
        recommendations: this.generateRecommendations(trends)
      };

      return summary;
    } catch (error) {
      errorHandler.handleError(error, 'generateHealthSummaryReport');
      return null;
    }
  }

  private generateKeyInsights(trends: HealthTrend[], alerts: any[]): string[] {
    const insights = [];

    const improvingTrends = trends.filter(t => t.direction === 'improving');
    const decliningTrends = trends.filter(t => t.direction === 'declining');

    if (improvingTrends.length > 0) {
      insights.push(`${improvingTrends.length} health metrics showing improvement`);
    }

    if (decliningTrends.length > 0) {
      insights.push(`${decliningTrends.length} health metrics need attention`);
    }

    if (alerts.length > 0) {
      insights.push(`${alerts.length} health alerts in the selected period`);
    }

    const significantTrends = trends.filter(t => t.significance === 'high');
    if (significantTrends.length > 0) {
      insights.push(`${significantTrends.length} statistically significant health trends identified`);
    }

    return insights;
  }

  private generateRecommendations(trends: HealthTrend[]): string[] {
    const recommendations = [];

    const decliningTrends = trends.filter(t => t.direction === 'declining' && t.significance !== 'low');
    
    decliningTrends.forEach(trend => {
      switch (trend.metric) {
        case 'steps':
          recommendations.push('Consider increasing daily physical activity');
          break;
        case 'sleep_hours':
          recommendations.push('Focus on improving sleep quality and duration');
          break;
        case 'weight':
          if (trend.direction === 'declining') {
            recommendations.push('Monitor weight changes and consult healthcare provider if concerning');
          }
          break;
        default:
          recommendations.push(`Monitor ${trend.metric} trends and discuss with healthcare provider`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Continue maintaining healthy lifestyle habits');
    }

    return recommendations;
  }

  async getDashboard(dashboardId: string): Promise<HealthDashboard | null> {
    return this.dashboards.get(dashboardId) || null;
  }

  async updateDashboard(dashboardId: string, updates: Partial<HealthDashboard>): Promise<void> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const updatedDashboard = { ...dashboard, ...updates, updatedAt: new Date().toISOString() };

      await supabase
        .from('health_dashboards')
        .update({
          ...updatedDashboard,
          widgets: JSON.stringify(updatedDashboard.widgets),
          layout: JSON.stringify(updatedDashboard.layout)
        })
        .eq('id', dashboardId);

      this.dashboards.set(dashboardId, updatedDashboard);

      logger.info('Dashboard updated', 'VISUALIZATION', { dashboardId });
    } catch (error) {
      errorHandler.handleError(error, 'updateDashboard');
    }
  }

  private async startTrendAnalysis(): Promise<void> {
    // Update trends daily
    setInterval(async () => {
      await this.updateAllTrends();
    }, 24 * 60 * 60 * 1000);
  }

  private async updateAllTrends(): Promise<void> {
    try {
      const { data: patients } = await supabase
        .from('user_profiles')
        .select('id');

      if (patients) {
        for (const patient of patients) {
          await this.generateHealthTrends(patient.id);
        }
      }

      logger.info('All health trends updated', 'VISUALIZATION');
    } catch (error) {
      logger.error('Failed to update trends', 'VISUALIZATION', error);
    }
  }
}

export const healthDataVisualization = new HealthDataVisualization();
