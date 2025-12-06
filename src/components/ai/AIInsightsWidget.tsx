import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles, ArrowRight, Loader2, RefreshCw, Brain, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIInsight {
  type: 'warning' | 'recommendation' | 'info' | 'success';
  title: string;
  description: string;
  action?: {
    label: string;
    route: string;
  };
}

interface AIInsightsWidgetProps {
  context: 'health' | 'vitals' | 'records' | 'provider' | 'iot';
  data?: Record<string, any>;
  compact?: boolean;
}

export const AIInsightsWidget = ({ context, data, compact = false }: AIInsightsWidgetProps) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const navigate = useNavigate();

  const getContextPrompt = () => {
    switch (context) {
      case 'health':
        return `Analyze these health metrics and provide 2-3 brief insights: ${JSON.stringify(data)}`;
      case 'vitals':
        return `Review these vital signs and give 2-3 quick health recommendations: ${JSON.stringify(data)}`;
      case 'records':
        return `Based on these medical records, provide 2-3 key observations: ${JSON.stringify(data)}`;
      case 'provider':
        return `As a clinical decision support, analyze this patient data and provide 2-3 actionable insights: ${JSON.stringify(data)}`;
      case 'iot':
        return `Analyze this IoT health device data and provide 2-3 real-time health insights: ${JSON.stringify(data)}`;
      default:
        return `Provide 2-3 general health insights based on: ${JSON.stringify(data)}`;
    }
  };

  const parseInsights = (text: string): AIInsight[] => {
    const parsed: AIInsight[] = [];
    
    // Simple parsing - look for patterns
    if (text.toLowerCase().includes('warning') || text.toLowerCase().includes('concern') || text.toLowerCase().includes('alert')) {
      parsed.push({
        type: 'warning',
        title: 'Health Alert',
        description: text.split('.')[0] + '.',
        action: { label: 'Chat with AI', route: '/ai-diagnostics' }
      });
    }
    
    if (text.toLowerCase().includes('recommend') || text.toLowerCase().includes('suggest')) {
      parsed.push({
        type: 'recommendation',
        title: 'AI Recommendation',
        description: text.includes('recommend') 
          ? text.substring(text.indexOf('recommend'), Math.min(text.indexOf('recommend') + 150, text.length)).split('.')[0] + '.'
          : text.split('.').slice(0, 2).join('.') + '.',
        action: { label: 'Learn More', route: '/ai-diagnostics' }
      });
    }
    
    // If no specific patterns found, create general insight
    if (parsed.length === 0) {
      const sentences = text.split('.').filter(s => s.trim().length > 10);
      parsed.push({
        type: 'info',
        title: 'AI Health Insight',
        description: sentences.slice(0, 2).join('.') + '.',
        action: { label: 'Get Full Analysis', route: '/ai-diagnostics' }
      });
    }

    return parsed.slice(0, 3);
  };

  const generateInsights = async () => {
    setLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('doc-chat', {
        body: { 
          message: getContextPrompt(),
          context: `Generate brief, actionable health insights. Keep each insight under 50 words. Focus on: 1) Any concerning patterns, 2) Positive observations, 3) Recommendations for improvement.`
        }
      });

      if (error) throw error;

      const aiText = response?.reply || response?.message || '';
      const parsedInsights = parseInsights(aiText);
      setInsights(parsedInsights);
      setHasGenerated(true);
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('Could not generate AI insights');
      // Provide fallback insights
      setInsights([{
        type: 'info',
        title: 'AI Assistant Available',
        description: 'Chat with our AI for personalized health guidance.',
        action: { label: 'Start Chat', route: '/ai-diagnostics' }
      }]);
      setHasGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'recommendation': return <Brain className="h-4 w-4 text-primary" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getInsightBadgeVariant = (type: AIInsight['type']) => {
    switch (type) {
      case 'warning': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'recommendation': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="p-2 rounded-full bg-primary/20">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">AI Health Assistant</p>
          <p className="text-xs text-muted-foreground">Get personalized insights</p>
        </div>
        <Button size="sm" onClick={() => navigate('/ai-diagnostics')} className="gap-1">
          <Sparkles className="h-3 w-3" />
          Chat
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/20">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg">AI Health Insights</span>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          {hasGenerated && (
            <Button variant="ghost" size="sm" onClick={generateInsights} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasGenerated ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Get AI-powered analysis and personalized health recommendations
            </p>
            <Button onClick={generateInsights} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((insight, idx) => (
                  <div key={idx} className="p-3 border rounded-lg bg-background/50">
                    <div className="flex items-start gap-3">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{insight.title}</span>
                          <Badge variant="outline" className={`text-xs ${getInsightBadgeVariant(insight.type)}`}>
                            {insight.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                        {insight.action && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 h-auto text-primary"
                            onClick={() => navigate(insight.action!.route)}
                          >
                            {insight.action.label}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">Powered by Doc 0 Clock AI</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/ai-diagnostics')} className="gap-1">
            Full AI Chat
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
