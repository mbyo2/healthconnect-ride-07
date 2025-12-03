import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Heart, Thermometer, Activity, Brain, Eye, Bot, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Symptoms = () => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const navigate = useNavigate();

  const symptomCategories = [
    {
      title: 'General',
      icon: <Activity className="h-5 w-5" />,
      symptoms: ['Fever', 'Fatigue', 'Weight Loss', 'Nausea', 'Dizziness']
    },
    {
      title: 'Cardiovascular',
      icon: <Heart className="h-5 w-5" />,
      symptoms: ['Chest Pain', 'Shortness of Breath', 'Palpitations', 'Swelling']
    },
    {
      title: 'Neurological',
      icon: <Brain className="h-5 w-5" />,
      symptoms: ['Headache', 'Memory Issues', 'Confusion', 'Seizures']
    },
    {
      title: 'Sensory',
      icon: <Eye className="h-5 w-5" />,
      symptoms: ['Vision Problems', 'Hearing Loss', 'Tinnitus', 'Smell/Taste Loss']
    }
  ];

  const toggleSymptom = useCallback((symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  }, []);

  const handleSubmit = () => {
    if (selectedSymptoms.length === 0) {
      toast.error('Please select at least one symptom');
      return;
    }
    toast.success('Symptoms recorded successfully');
    console.log({ selectedSymptoms, severity, description });
  };

  const handleAIAnalysis = () => {
    // Navigate to AI diagnostics with selected symptoms
    const symptomsQuery = selectedSymptoms.join(', ');
    navigate('/ai-diagnostics', { state: { symptoms: symptomsQuery } });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      <div className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Symptom Tracker</h1>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Record your symptoms to help healthcare providers understand your condition
        </p>
      </div>

      {/* AI Assistant Banner */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 rounded-full bg-primary/20 flex-shrink-0">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">Doc 0 Clock AI Assistant</h3>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Get instant AI-powered analysis of your symptoms, upload medical images, and receive personalized health guidance 24/7.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/ai-diagnostics')}
              className="w-full sm:w-auto gap-2"
            >
              Chat with AI
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Symptoms</CardTitle>
              <CardDescription>Choose all symptoms you're currently experiencing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {symptomCategories.map((category) => (
                <div key={category.title}>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    {category.icon}
                    {category.title}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {category.symptoms.map((symptom) => (
                      <Badge
                        key={symptom}
                        variant={selectedSymptoms.includes(symptom) ? "default" : "outline"}
                        className="cursor-pointer text-xs md:text-sm px-2 py-1 hover:shadow-sm transition-all touch-manipulation active:scale-95"
                        onClick={() => toggleSymptom(symptom)}
                      >
                        {symptom}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Symptom Details</CardTitle>
              <CardDescription>Provide additional information about your symptoms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Severity (1-10)</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  placeholder="Rate severity from 1 (mild) to 10 (severe)"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your symptoms in detail..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  onClick={handleSubmit} 
                  className="w-full touch-manipulation hover:shadow-sm transition-all active:scale-95"
                  size="lg"
                >
                  Record Symptoms
                </Button>
                <Button 
                  onClick={handleAIAnalysis}
                  variant="outline"
                  className="w-full touch-manipulation hover:shadow-sm transition-all active:scale-95 gap-2"
                  size="lg"
                  disabled={selectedSymptoms.length === 0}
                >
                  <Bot className="h-4 w-4" />
                  AI Analysis
                </Button>
              </div>
            </CardContent>
          </Card>

          {selectedSymptoms.length > 0 && (
            <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader>
                <CardTitle className="text-base">Selected Symptoms ({selectedSymptoms.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedSymptoms.map((symptom) => (
                    <Badge 
                      key={symptom} 
                      variant="default"
                      className="cursor-pointer hover:bg-destructive transition-colors"
                      onClick={() => toggleSymptom(symptom)}
                    >
                      {symptom} ×
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Symptoms;
