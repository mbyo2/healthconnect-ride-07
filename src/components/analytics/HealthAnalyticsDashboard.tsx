import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Heart, Activity, Brain, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { aiHealthInsights, HealthInsight, HealthScore } from '../../utils/ai-health-insights';
import { logger } from '../../utils/logger';

interface HealthAnalyticsDashboardProps {
  userId: string;
  className?: string;
}

export const HealthAnalyticsDashboard: React.FC<HealthAnalyticsDashboardProps> = ({
  userId,
  className
}) => {
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    loadHealthData();
  }, [userId, selectedTimeframe]);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      
      const [insightsData, scoreData] = await Promise.all([
        aiHealthInsights.generateHealthInsights(userId),
        aiHealthInsights.calculateHealthScore(userId)
      ]);
      
      setInsights(insightsData);
      setHealthScore(scoreData);
      
      logger.info('Health analytics data loaded', 'HEALTH_ANALYTICS', {
        insights: insightsData.length,
        overallScore: scoreData.overall
      });
    } catch (error) {
      logger.error('Failed to load health analytics', 'HEALTH_ANALYTICS', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: HealthInsight['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityTextColor = (severity: HealthInsight['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreDescription = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Attention';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cardiovascular': return <Heart className="h-5 w-5" />;
      case 'metabolic': return <Activity className="h-5 w-5" />;
      case 'mental': return <Brain className="h-5 w-5" />;
      case 'lifestyle': return <TrendingUp className="h-5 w-5" />;
      case 'preventive': return <Shield className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Health Analytics</h1>
          <p className="text-muted-foreground">
            AI-powered insights and recommendations for your health
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map((timeframe) => (
            <Button
              key={timeframe}
              variant={selectedTimeframe === timeframe ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTimeframe(timeframe)}
            >
              {timeframe}
            </Button>
          ))}
        </div>
      </div>

      {/* Overall Health Score */}
      {healthScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Overall Health Score
            </CardTitle>
            <CardDescription>
              Comprehensive assessment based on your health data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(healthScore.overall)}`}>
                  {healthScore.overall}
                </div>
                <div className="text-sm text-muted-foreground">
                  {getScoreDescription(healthScore.overall)}
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(healthScore.categories).map(([category, score]) => (
                  <div key={category} className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      {getCategoryIcon(category)}
                    </div>
                    <div className={`text-lg font-semibold ${getScoreColor(score)}`}>
                      {score}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {category}
                    </div>
                    <Progress value={score} className="mt-1 h-1" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Insights Alert */}
      {insights.some(i => i.severity === 'critical') && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            You have critical health insights that require immediate attention. 
            Please review the recommendations below and consult with your healthcare provider.
          </AlertDescription>
        </Alert>
      )}

      {/* Health Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {insights.map((insight) => (
          <Card key={insight.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{insight.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {insight.description}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge 
                    variant="outline" 
                    className={`${getSeverityColor(insight.severity)} text-white border-0`}
                  >
                    {insight.severity}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(insight.confidence * 100)}% confidence
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Data Points */}
              {insight.dataPoints.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Key Data Points</h4>
                  <div className="space-y-1">
                    {insight.dataPoints.map((point, index) => (
                      <div key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {insight.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                  <div className="space-y-2">
                    {insight.recommendations.map((rec, index) => (
                      <div key={index} className="text-sm bg-gray-50 p-3 rounded-lg flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              {insight.actionable && (
                <Button variant="outline" size="sm" className="w-full">
                  Take Action
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Factors */}
      {healthScore?.riskFactors && healthScore.riskFactors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Factors
            </CardTitle>
            <CardDescription>
              Identified risk factors that may impact your health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {healthScore.riskFactors.map((risk, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{risk.factor}</h4>
                    <Badge variant={risk.modifiable ? "default" : "secondary"}>
                      {risk.modifiable ? "Modifiable" : "Non-modifiable"}
                    </Badge>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Risk Level</span>
                      <span className={getSeverityTextColor(risk.impact)}>
                        {risk.riskLevel}%
                      </span>
                    </div>
                    <Progress value={risk.riskLevel} className="h-2" />
                  </div>

                  {risk.recommendations.length > 0 && (
                    <div className="space-y-1">
                      {risk.recommendations.slice(0, 2).map((rec, recIndex) => (
                        <div key={recIndex} className="text-xs text-muted-foreground">
                          • {rec}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Trends */}
      {healthScore?.trends && healthScore.trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Health Trends
            </CardTitle>
            <CardDescription>
              Analysis of your health metrics over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {healthScore.trends.map((trend, index) => (
                <div key={index} className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {trend.trend === 'improving' ? (
                      <TrendingUp className="h-6 w-6 text-green-500" />
                    ) : trend.trend === 'declining' ? (
                      <TrendingDown className="h-6 w-6 text-red-500" />
                    ) : (
                      <Activity className="h-6 w-6 text-gray-500" />
                    )}
                  </div>
                  <h4 className="font-medium mb-1">{trend.metric}</h4>
                  <div className={`text-sm ${
                    trend.trend === 'improving' ? 'text-green-600' :
                    trend.trend === 'declining' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {trend.changePercent > 0 ? '+' : ''}{trend.changePercent}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {trend.timeframe}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {insights.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Health Insights Available</h3>
            <p className="text-muted-foreground mb-4">
              We need more health data to generate personalized insights and recommendations.
            </p>
            <Button>Add Health Data</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HealthAnalyticsDashboard;
