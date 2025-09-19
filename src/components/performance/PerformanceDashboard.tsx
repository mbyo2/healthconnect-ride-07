import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  TrendingUp, 
  Clock, 
  Download, 
  Memory, 
  Network,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { performanceOptimizer, PerformanceMetrics, OptimizationSuggestion } from '@/utils/performance-optimizer';

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [performanceReport, setPerformanceReport] = useState<any>(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    try {
      const currentMetrics = performanceOptimizer.getMetrics();
      const currentSuggestions = performanceOptimizer.getOptimizationSuggestions();
      
      setMetrics(currentMetrics);
      setSuggestions(currentSuggestions);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    }
  };

  const runPerformanceAudit = async () => {
    setIsRunningAudit(true);
    try {
      const report = await performanceOptimizer.runPerformanceAudit();
      setPerformanceReport(report);
      setMetrics(report.metrics);
      setSuggestions(report.suggestions);
    } catch (error) {
      console.error('Performance audit failed:', error);
    } finally {
      setIsRunningAudit(false);
    }
  };

  const formatTime = (time: number): string => {
    if (time < 1000) return `${Math.round(time)}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMetricStatus = (value: number, good: number, poor: number) => {
    if (value <= good) return { status: 'good', color: 'text-green-600' };
    if (value <= poor) return { status: 'needs-improvement', color: 'text-yellow-600' };
    return { status: 'poor', color: 'text-red-600' };
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading performance data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Performance Dashboard</h1>
        </div>
        <Button 
          onClick={runPerformanceAudit}
          disabled={isRunningAudit}
          className="flex items-center gap-2"
        >
          {isRunningAudit ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
          {isRunningAudit ? 'Running Audit...' : 'Run Performance Audit'}
        </Button>
      </div>

      {/* Performance Score */}
      {performanceReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Overall Performance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className={`text-4xl font-bold ${getScoreColor(performanceReport.score)}`}>
                {performanceReport.score}
              </div>
              <div className="flex-1">
                <Progress value={performanceReport.score} className="h-3" />
              </div>
              <Badge 
                variant={performanceReport.score >= 90 ? 'default' : performanceReport.score >= 70 ? 'secondary' : 'destructive'}
              >
                {performanceReport.score >= 90 ? 'Excellent' : performanceReport.score >= 70 ? 'Good' : 'Needs Work'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">First Contentful Paint</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${getMetricStatus(metrics.firstContentfulPaint, 1800, 3000).color}`}>
                {formatTime(metrics.firstContentfulPaint)}
              </div>
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Good: &lt; 1.8s, Poor: &gt; 3.0s
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Largest Contentful Paint</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${getMetricStatus(metrics.largestContentfulPaint, 2500, 4000).color}`}>
                {formatTime(metrics.largestContentfulPaint)}
              </div>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Good: &lt; 2.5s, Poor: &gt; 4.0s
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">First Input Delay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${getMetricStatus(metrics.firstInputDelay, 100, 300).color}`}>
                {formatTime(metrics.firstInputDelay)}
              </div>
              <Zap className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Good: &lt; 100ms, Poor: &gt; 300ms
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bundle Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">
                {formatSize(metrics.bundleSize)}
              </div>
              <Download className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">
                {formatSize(metrics.memoryUsage)}
              </div>
              <Memory className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Network Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">
                {metrics.networkRequests}
              </div>
              <Network className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Load Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">
                {formatTime(metrics.loadTime)}
              </div>
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Optimization Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          suggestion.type === 'critical' ? 'destructive' : 
                          suggestion.type === 'important' ? 'default' : 'secondary'
                        }
                      >
                        {suggestion.type}
                      </Badge>
                      <Badge variant="outline">{suggestion.category}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">
                        Impact: {suggestion.impact}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Effort: {suggestion.effort}
                      </Badge>
                    </div>
                  </div>
                  <h3 className="font-medium mb-1">{suggestion.description}</h3>
                  <p className="text-sm text-gray-600">{suggestion.implementation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applied Optimizations */}
      {performanceReport?.optimizations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Applied Optimizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {performanceReport.optimizations.map((opt: any, index: number) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${opt.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="flex-1">
                    <div className="font-medium text-sm capitalize">
                      {opt.name.replace(/-/g, ' ')}
                    </div>
                    <div className="text-xs text-gray-600">{opt.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {performanceReport?.recommendations && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {performanceReport.recommendations.map((rec: string, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
