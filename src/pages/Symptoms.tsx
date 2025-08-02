
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Heart, Thermometer, Activity, Brain, Eye, Ear } from 'lucide-react';

const Symptoms = () => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<string>('');
  const [description, setDescription] = useState<string>('');

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

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleSubmit = () => {
    // Handle symptom submission
    console.log({ selectedSymptoms, severity, description });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      <div className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Symptom Tracker</h1>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Record your symptoms to help healthcare providers understand your condition
        </p>
      </div>

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
                         className="cursor-pointer text-xs md:text-sm px-2 py-1 hover:shadow-sm transition-all touch-manipulation"
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

               <Button 
                 onClick={handleSubmit} 
                 className="w-full touch-manipulation hover:shadow-sm transition-all active:scale-95"
                 size="lg"
               >
                 Record Symptoms
               </Button>
            </CardContent>
          </Card>

          {selectedSymptoms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Symptoms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedSymptoms.map((symptom) => (
                    <Badge key={symptom} variant="default">
                      {symptom}
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
