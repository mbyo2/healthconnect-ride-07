import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Stethoscope, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User,
  Plus,
  X,
  Search,
  FileText,
  TrendingUp
} from 'lucide-react';
import { aiDiagnosticAssistant } from '@/utils/ai-diagnostic-assistant';

interface AIDiagnosticAssistantProps {
  patientId: string;
  onDiagnosisComplete?: (diagnosis: any) => void;
}

interface SymptomInput {
  id: string;
  symptom: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
  notes?: string;
}

interface PatientContext {
  age: number;
  gender: 'male' | 'female' | 'other';
  medicalHistory: string[];
  medications: string[];
  allergies: string[];
  vitalSigns?: {
    temperature?: number;
    bloodPressure?: string;
    heartRate?: number;
    respiratoryRate?: number;
  };
}

export const AIDiagnosticAssistant: React.FC<AIDiagnosticAssistantProps> = ({ 
  patientId, 
  onDiagnosisComplete 
}) => {
  const [symptoms, setSymptoms] = useState<SymptomInput[]>([]);
  const [patientContext, setPatientContext] = useState<PatientContext>({
    age: 0,
    gender: 'other',
    medicalHistory: [],
    medications: [],
    allergies: []
  });
  const [currentSymptom, setCurrentSymptom] = useState('');
  const [currentSeverity, setCurrentSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
  const [currentDuration, setCurrentDuration] = useState('');
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('symptoms');
  const [suggestedSymptoms, setSuggestedSymptoms] = useState<string[]>([]);

  useEffect(() => {
    loadPatientContext();
    loadSuggestedSymptoms();
  }, [patientId]);

  const loadPatientContext = async () => {
    try {
      // In a real implementation, load from patient records
      const mockContext: PatientContext = {
        age: 35,
        gender: 'female',
        medicalHistory: ['Hypertension', 'Diabetes Type 2'],
        medications: ['Metformin', 'Lisinopril'],
        allergies: ['Penicillin'],
        vitalSigns: {
          temperature: 98.6,
          bloodPressure: '120/80',
          heartRate: 72,
          respiratoryRate: 16
        }
      };
      setPatientContext(mockContext);
    } catch (error) {
      console.error('Failed to load patient context:', error);
    }
  };

  const loadSuggestedSymptoms = async () => {
    try {
      const suggestions = await aiDiagnosticAssistant.getSuggestedSymptoms();
      setSuggestedSymptoms(suggestions || []);
    } catch (error) {
      console.error('Failed to load suggested symptoms:', error);
    }
  };

  const addSymptom = () => {
    if (!currentSymptom.trim()) return;

    const newSymptom: SymptomInput = {
      id: `symptom_${Date.now()}`,
      symptom: currentSymptom.trim(),
      severity: currentSeverity,
      duration: currentDuration
    };

    setSymptoms([...symptoms, newSymptom]);
    setCurrentSymptom('');
    setCurrentDuration('');
  };

  const removeSymptom = (id: string) => {
    setSymptoms(symptoms.filter(s => s.id !== id));
  };

  const addSuggestedSymptom = (symptom: string) => {
    setCurrentSymptom(symptom);
  };

  const updatePatientContext = (field: keyof PatientContext, value: any) => {
    setPatientContext(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addToList = (field: 'medicalHistory' | 'medications' | 'allergies', value: string) => {
    if (!value.trim()) return;
    
    setPatientContext(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()]
    }));
  };

  const removeFromList = (field: 'medicalHistory' | 'medications' | 'allergies', index: number) => {
    setPatientContext(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const runDiagnosis = async () => {
    if (symptoms.length === 0) {
      alert('Please add at least one symptom before running diagnosis.');
      return;
    }

    try {
      setLoading(true);
      setActiveTab('results');

      const symptomList = symptoms.map(s => s.symptom);
      const result = await aiDiagnosticAssistant.analyzeDiagnosis(
        patientId,
        symptomList,
        patientContext
      );

      setDiagnosis(result);
      
      if (onDiagnosisComplete) {
        onDiagnosisComplete(result);
      }
    } catch (error) {
      console.error('Diagnosis failed:', error);
      alert('Diagnosis analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'severe': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-6 h-6 mr-2 text-blue-600" />
            AI Diagnostic Assistant
          </CardTitle>
          <CardDescription>
            Advanced symptom analysis and diagnostic recommendations powered by AI
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
          <TabsTrigger value="context">Patient Context</TabsTrigger>
          <TabsTrigger value="vitals">Vital Signs</TabsTrigger>
          <TabsTrigger value="results">Diagnosis Results</TabsTrigger>
        </TabsList>

        {/* Symptoms Tab */}
        <TabsContent value="symptoms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Symptom Input</CardTitle>
              <CardDescription>
                Add symptoms experienced by the patient
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Symptom Input Form */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="symptom">Symptom</Label>
                  <Input
                    id="symptom"
                    value={currentSymptom}
                    onChange={(e) => setCurrentSymptom(e.target.value)}
                    placeholder="e.g., headache, fever, cough"
                    onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
                  />
                </div>
                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <select
                    id="severity"
                    value={currentSeverity}
                    onChange={(e) => setCurrentSeverity(e.target.value as any)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    value={currentDuration}
                    onChange={(e) => setCurrentDuration(e.target.value)}
                    placeholder="e.g., 2 days, 1 week"
                  />
                </div>
              </div>
              
              <Button onClick={addSymptom} className="w-full md:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Symptom
              </Button>

              {/* Suggested Symptoms */}
              {suggestedSymptoms.length > 0 && (
                <div>
                  <Label>Suggested Symptoms</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {suggestedSymptoms.slice(0, 8).map((symptom, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer hover:bg-blue-50"
                        onClick={() => addSuggestedSymptom(symptom)}
                      >
                        {symptom}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Current Symptoms List */}
              <div>
                <Label>Current Symptoms ({symptoms.length})</Label>
                <div className="space-y-2 mt-2">
                  {symptoms.map((symptom) => (
                    <div key={symptom.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{symptom.symptom}</span>
                          <Badge className={getSeverityColor(symptom.severity)}>
                            {symptom.severity}
                          </Badge>
                        </div>
                        {symptom.duration && (
                          <p className="text-sm text-gray-600 mt-1">Duration: {symptom.duration}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSymptom(symptom.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {symptoms.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No symptoms added yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patient Context Tab */}
        <TabsContent value="context" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Patient Information</CardTitle>
              <CardDescription>
                Patient demographics and medical history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={patientContext.age}
                    onChange={(e) => updatePatientContext('age', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    value={patientContext.gender}
                    onChange={(e) => updatePatientContext('gender', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Medical History */}
              <div>
                <Label>Medical History</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {patientContext.medicalHistory.map((condition, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center">
                      {condition}
                      <X 
                        className="w-3 h-3 ml-1 cursor-pointer" 
                        onClick={() => removeFromList('medicalHistory', index)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex mt-2">
                  <Input
                    placeholder="Add medical condition"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addToList('medicalHistory', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              {/* Current Medications */}
              <div>
                <Label>Current Medications</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {patientContext.medications.map((medication, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center">
                      {medication}
                      <X 
                        className="w-3 h-3 ml-1 cursor-pointer" 
                        onClick={() => removeFromList('medications', index)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex mt-2">
                  <Input
                    placeholder="Add medication"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addToList('medications', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              {/* Allergies */}
              <div>
                <Label>Known Allergies</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {patientContext.allergies.map((allergy, index) => (
                    <Badge key={index} variant="destructive" className="flex items-center">
                      {allergy}
                      <X 
                        className="w-3 h-3 ml-1 cursor-pointer" 
                        onClick={() => removeFromList('allergies', index)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex mt-2">
                  <Input
                    placeholder="Add allergy"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addToList('allergies', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vital Signs Tab */}
        <TabsContent value="vitals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vital Signs</CardTitle>
              <CardDescription>
                Current vital signs and measurements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="temperature">Temperature (°F)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={patientContext.vitalSigns?.temperature || ''}
                    onChange={(e) => updatePatientContext('vitalSigns', {
                      ...patientContext.vitalSigns,
                      temperature: parseFloat(e.target.value) || undefined
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="bloodPressure">Blood Pressure</Label>
                  <Input
                    id="bloodPressure"
                    placeholder="120/80"
                    value={patientContext.vitalSigns?.bloodPressure || ''}
                    onChange={(e) => updatePatientContext('vitalSigns', {
                      ...patientContext.vitalSigns,
                      bloodPressure: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="heartRate">Heart Rate (BPM)</Label>
                  <Input
                    id="heartRate"
                    type="number"
                    value={patientContext.vitalSigns?.heartRate || ''}
                    onChange={(e) => updatePatientContext('vitalSigns', {
                      ...patientContext.vitalSigns,
                      heartRate: parseInt(e.target.value) || undefined
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="respiratoryRate">Respiratory Rate</Label>
                  <Input
                    id="respiratoryRate"
                    type="number"
                    value={patientContext.vitalSigns?.respiratoryRate || ''}
                    onChange={(e) => updatePatientContext('vitalSigns', {
                      ...patientContext.vitalSigns,
                      respiratoryRate: parseInt(e.target.value) || undefined
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {!diagnosis && !loading && (
            <Card>
              <CardContent className="text-center py-8">
                <Stethoscope className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No diagnosis results yet. Run analysis to see results.</p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="text-center py-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Analyzing symptoms and generating diagnosis...</p>
              </CardContent>
            </Card>
          )}

          {diagnosis && (
            <div className="space-y-4">
              {/* Diagnosis Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                    Diagnosis Complete
                  </CardTitle>
                  <CardDescription>
                    Analysis completed on {new Date(diagnosis.timestamp).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {diagnosis.suggestions?.length || 0}
                      </div>
                      <div className="text-sm text-gray-600">Diagnostic Suggestions</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getUrgencyColor(diagnosis.urgency)}`}>
                        {diagnosis.urgency?.toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-600">Urgency Level</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round((diagnosis.confidence || 0) * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">Confidence</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Diagnostic Suggestions */}
              {diagnosis.suggestions && diagnosis.suggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Diagnostic Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {diagnosis.suggestions.map((suggestion: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{suggestion.condition}</h4>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">
                                {Math.round(suggestion.probability * 100)}% match
                              </Badge>
                              <Badge className={getSeverityColor(suggestion.urgency)}>
                                {suggestion.urgency}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-gray-600 mb-2">{suggestion.reasoning}</p>
                          <Progress value={suggestion.probability * 100} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Red Flags */}
              {diagnosis.redFlags && diagnosis.redFlags.length > 0 && (
                <Alert className="border-red-500">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Red Flags Identified</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      {diagnosis.redFlags.map((flag: string, index: number) => (
                        <li key={index}>{flag}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Recommendations */}
              {diagnosis.recommendations && diagnosis.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {diagnosis.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setActiveTab('symptoms')}>
          <Search className="w-4 h-4 mr-2" />
          Back to Symptoms
        </Button>
        <Button 
          onClick={runDiagnosis} 
          disabled={loading || symptoms.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Run AI Diagnosis
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AIDiagnosticAssistant;
