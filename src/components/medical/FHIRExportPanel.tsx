import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, FileJson, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const RESOURCE_TYPES = [
  { id: 'Patient', label: 'Patient Demographics', description: 'Name, contact, DOB' },
  { id: 'Condition', label: 'Conditions & Diagnoses', description: 'Medical conditions from records' },
  { id: 'MedicationRequest', label: 'Medications & Prescriptions', description: 'Active and past prescriptions' },
  { id: 'Observation', label: 'Health Observations', description: 'Vital signs and lab results' },
  { id: 'Appointment', label: 'Appointments', description: 'Scheduled and past visits' },
];

export const FHIRExportPanel = ({ patientId }: { patientId?: string }) => {
  const { user } = useAuth();
  const [selectedTypes, setSelectedTypes] = useState<string[]>(RESOURCE_TYPES.map(r => r.id));
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<{ resourceCount: number; timestamp: string } | null>(null);

  const toggleType = (id: string) => {
    setSelectedTypes(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleExport = async () => {
    if (selectedTypes.length === 0) {
      toast.error('Select at least one resource type');
      return;
    }

    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('fhir-export', {
        body: { patientId: patientId || user?.id, resourceTypes: selectedTypes },
      });

      if (error) throw error;

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/fhir+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-records-fhir-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastExport({ resourceCount: data.total || 0, timestamp: new Date().toISOString() });
      toast.success(`Exported ${data.total} FHIR resources`);
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-primary" />
              FHIR R4 Export
            </CardTitle>
            <CardDescription>Export medical records in HL7 FHIR R4 standard format</CardDescription>
          </div>
          <Badge variant="outline">HL7 FHIR R4</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select resources to export:</Label>
          {RESOURCE_TYPES.map(type => (
            <div key={type.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <Checkbox
                id={type.id}
                checked={selectedTypes.includes(type.id)}
                onCheckedChange={() => toggleType(type.id)}
              />
              <div>
                <Label htmlFor={type.id} className="cursor-pointer font-medium">{type.label}</Label>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </div>
            </div>
          ))}
        </div>

        {lastExport && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-sm">
            <CheckCircle className="h-4 w-4" />
            Last export: {lastExport.resourceCount} resources at {new Date(lastExport.timestamp).toLocaleTimeString()}
          </div>
        )}

        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0" />
          FHIR R4 bundles are compatible with Epic, Cerner, Allscripts, and other EHR systems
        </div>

        <Button onClick={handleExport} disabled={isExporting || selectedTypes.length === 0} className="w-full gap-2">
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isExporting ? 'Exporting...' : 'Export FHIR Bundle'}
        </Button>
      </CardContent>
    </Card>
  );
};
