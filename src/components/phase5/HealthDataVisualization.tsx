import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Heart, 
  Calendar,
  Download,
  Settings,
  Eye,
  Plus
} from 'lucide-react';
import { healthDataVisualization } from '@/utils/health-data-visualization';

interface HealthDataVisualizationProps {
  patientId: string;
}

interface HealthTrend {
  metric: string;
  direction: 'improving' | 'stable' | 'declining';
  changePercent: number;
  significance: 'high' | 'medium' | 'low';
  timeframe: string;
  dataPoints: number;
}

interface ChartData {
  datasets: any[];
  labels: string[];
}

export const HealthDataVisualization: React.FC<HealthDataVisualizationProps> = ({ patientId }) => {
  const [trends, setTrends] = useState<HealthTrend[]>([]);
  const [chartData, setChartData] = useState<ChartData>({ datasets: [], labels: [] });
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['heart_rate', 'blood_pressure', 'weight']);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'scatter'>('line');
  const [loading, setLoading] = useState(true);
  const [healthSummary, setHealthSummary] = useState<any>(null);

  useEffect(() => {
    loadVisualizationData();
  }, [patientId, selectedTimeRange, selectedMetrics, chartType]);

  const loadVisualizationData = async () => {
    try {
      setLoading(true);

      // Load health trends
      const healthTrends = await healthDataVisualization.generateHealthTrends(patientId, selectedTimeRange);
      setTrends(healthTrends);

      // Load chart data
      const config = {
        chartType,
        metrics: selectedMetrics,
        timeRange: selectedTimeRange,
        aggregation: 'daily' as const,
        filters: {},
        styling: {
          colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'],
          theme: 'light' as const,
          responsive: true
        }
      };

      const vizData = await healthDataVisualization.generateVisualizationData(config, patientId);
      setChartData(vizData);

      // Load health summary
      const summary = await healthDataVisualization.generateHealthSummaryReport(patientId, selectedTimeRange);
      setHealthSummary(summary);

    } catch (error) {
      console.error('Failed to load visualization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewDashboard = async () => {
    try {
      const widgets = [
        {
          id: 'widget_1',
          type: 'chart' as const,
          title: 'Health Trends',
          config: {
            chartType: 'line' as const,
            metrics: selectedMetrics,
            timeRange: selectedTimeRange,
            aggregation: 'daily' as const,
            filters: {},
            styling: {
              colors: ['#3b82f6', '#ef4444', '#10b981'],
              theme: 'light' as const,
              responsive: true
            }
          },
          position: { x: 0, y: 0, width: 6, height: 4 }
        },
        {
          id: 'widget_2',
          type: 'summary' as const,
          title: 'Health Summary',
          config: {
            chartType: 'bar' as const,
            metrics: ['steps', 'sleep_hours'],
            timeRange: '7d',
            aggregation: 'daily' as const,
            filters: {},
            styling: {
              colors: ['#10b981', '#8b5cf6'],
              theme: 'light' as const,
              responsive: true
            }
          },
          position: { x: 6, y: 0, width: 6, height: 4 }
        }
      ];

      const dashboard = await healthDataVisualization.createDashboard(
        patientId,
        `Health Dashboard - ${new Date().toLocaleDateString()}`,
        widgets
      );

      setDashboards([...dashboards, dashboard]);
      alert('Dashboard created successfully!');
    } catch (error) {
      console.error('Failed to create dashboard:', error);
      alert('Failed to create dashboard');
    }
  };

  const downloadReport = async () => {
    try {
      const report = await healthDataVisualization.generateHealthSummaryReport(patientId, selectedTimeRange);
      
      const reportData = JSON.stringify(report, null, 2);
      const blob = new Blob([reportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-report-${patientId}-${selectedTimeRange}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'stable': return <Activity className="w-4 h-4 text-blue-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'improving': return 'text-green-600 bg-green-50';
      case 'declining': return 'text-red-600 bg-red-50';
      case 'stable': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMetricName = (metric: string) => {
    return metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Simple chart rendering component
  const SimpleChart: React.FC<{ data: ChartData; type: string }> = ({ data, type }) => {
    if (!data.datasets || data.datasets.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available for visualization
        </div>
      );
    }

    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Chart visualization would render here</p>
          <p className="text-sm text-gray-500">
            {data.datasets.length} dataset(s) • {data.labels?.length || 0} data points
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
              Health Data Visualization
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={downloadReport}>
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button onClick={createNewDashboard}>
                <Plus className="w-4 h-4 mr-2" />
                Create Dashboard
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Advanced health data visualization and trend analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{trends.length}</div>
              <div className="text-sm text-gray-600">Health Trends</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {trends.filter(t => t.direction === 'improving').length}
              </div>
              <div className="text-sm text-gray-600">Improving</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {trends.filter(t => t.direction === 'declining').length}
              </div>
              <div className="text-sm text-gray-600">Declining</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {chartData.datasets?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Data Sources</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Visualization Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Time Range</label>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Chart Type</label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as any)}
                className="w-full p-2 border rounded-md"
              >
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
                <option value="scatter">Scatter Plot</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Metrics</label>
              <div className="flex flex-wrap gap-1">
                {['heart_rate', 'blood_pressure', 'weight', 'glucose', 'steps'].map((metric) => (
                  <Badge
                    key={metric}
                    variant={selectedMetrics.includes(metric) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (selectedMetrics.includes(metric)) {
                        setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
                      } else {
                        setSelectedMetrics([...selectedMetrics, metric]);
                      }
                    }}
                  >
                    {formatMetricName(metric)}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="flex items-end">
              <Button onClick={loadVisualizationData} className="w-full">
                <Eye className="w-4 h-4 mr-2" />
                Update View
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Visualization */}
      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="trends">Trends Analysis</TabsTrigger>
          <TabsTrigger value="summary">Health Summary</TabsTrigger>
          <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
        </TabsList>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Health Metrics Visualization</CardTitle>
              <CardDescription>
                {chartType.charAt(0).toUpperCase() + chartType.slice(1)} chart showing {selectedMetrics.length} metrics over {selectedTimeRange}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleChart data={chartData} type={chartType} />
            </CardContent>
          </Card>

          {/* Additional chart variations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Averages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">Weekly averages chart</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Correlation Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Activity className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">Metric correlations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Analysis Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trends.map((trend, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>{formatMetricName(trend.metric)}</span>
                    {getTrendIcon(trend.direction)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg ${getTrendColor(trend.direction)}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{trend.direction}</span>
                        <span className="font-bold">
                          {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Significance</span>
                      <Badge className={getSignificanceColor(trend.significance)}>
                        {trend.significance}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Data Points</span>
                      <span className="text-sm font-medium">{trend.dataPoints}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Timeframe</span>
                      <span className="text-sm font-medium">{trend.timeframe}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {trends.length === 0 && (
              <div className="col-span-full text-center py-8">
                <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No trends available</p>
                <p className="text-sm text-gray-500">Add more health data to see trend analysis</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Health Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          {healthSummary ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Heart className="w-5 h-5 mr-2" />
                    Health Summary Report
                  </CardTitle>
                  <CardDescription>
                    Generated on {new Date(healthSummary.generatedAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {healthSummary.metrics?.total || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Metrics</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {healthSummary.trends?.improving || 0}
                      </div>
                      <div className="text-sm text-gray-600">Improving Trends</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {healthSummary.alerts?.total || 0}
                      </div>
                      <div className="text-sm text-gray-600">Health Alerts</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Insights */}
              {healthSummary.keyInsights && healthSummary.keyInsights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Key Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {healthSummary.keyInsights.map((insight: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {healthSummary.recommendations && healthSummary.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Health Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {healthSummary.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <Heart className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No health summary available</p>
                <Button onClick={loadVisualizationData} className="mt-4">
                  Generate Summary
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Dashboards Tab */}
        <TabsContent value="dashboards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map((dashboard, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{dashboard.name}</CardTitle>
                  <CardDescription>
                    {dashboard.widgets?.length || 0} widgets • Created {new Date(dashboard.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Visibility</span>
                      <Badge variant={dashboard.isPublic ? "default" : "secondary"}>
                        {dashboard.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    <Eye className="w-4 h-4 mr-2" />
                    View Dashboard
                  </Button>
                </CardContent>
              </Card>
            ))}
            
            {dashboards.length === 0 && (
              <div className="col-span-full text-center py-8">
                <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No dashboards created</p>
                <Button onClick={createNewDashboard} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Dashboard
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
