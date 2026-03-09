import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Phone, Mail, Calendar, Pill, FileText, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PatientDetailSheetProps {
  patientId: string | null;
  open: boolean;
  onClose: () => void;
}

export const PatientDetailSheet = ({ patientId, open, onClose }: PatientDetailSheetProps) => {
  const [patient, setPatient] = useState<any>(null);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId || !open) return;
    setLoading(true);

    const fetchAll = async () => {
      const [profileRes, admRes, rxRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', patientId).single(),
        supabase.from('hospital_admissions').select('*').eq('patient_id', patientId).order('admission_date', { ascending: false }).limit(10),
        supabase.from('comprehensive_prescriptions').select('*').eq('patient_id', patientId).order('prescribed_date', { ascending: false }).limit(10),
      ]);

      setPatient(profileRes.data);
      setAdmissions(admRes.data || []);
      setPrescriptions(rxRes.data || []);
      setLoading(false);
    };

    fetchAll();
  }, [patientId, open]);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Patient Details
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : patient ? (
          <ScrollArea className="h-[calc(100vh-100px)] pr-4 mt-4">
            <div className="space-y-4">
              {/* Demographics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Demographics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{patient.first_name} {patient.last_name}</span>
                  </div>
                  {patient.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{patient.email}</span>
                    </div>
                  )}
                  {patient.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{patient.phone}</span>
                    </div>
                  )}
                  {patient.date_of_birth && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{format(new Date(patient.date_of_birth), 'PPP')}</span>
                    </div>
                  )}
                  {patient.blood_type && (
                    <Badge variant="outline" className="mt-1">Blood: {patient.blood_type}</Badge>
                  )}
                </CardContent>
              </Card>

              {/* Admission History */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Admission History ({admissions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {admissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No admissions found</p>
                  ) : (
                    <div className="space-y-2">
                      {admissions.map((adm) => (
                        <div key={adm.id} className="p-2 border rounded-md text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="font-medium">{adm.diagnosis || 'No diagnosis'}</span>
                            <Badge variant={adm.status === 'admitted' ? 'destructive' : 'secondary'} className="text-[10px]">
                              {adm.status}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            {format(new Date(adm.admission_date), 'MMM d, yyyy')}
                            {adm.discharge_date && ` → ${format(new Date(adm.discharge_date), 'MMM d, yyyy')}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Prescriptions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Pill className="h-4 w-4" />
                    Recent Prescriptions ({prescriptions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {prescriptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No prescriptions found</p>
                  ) : (
                    <div className="space-y-2">
                      {prescriptions.map((rx) => (
                        <div key={rx.id} className="p-2 border rounded-md text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="font-medium">{rx.medication_name}</span>
                            <Badge variant="outline" className="text-[10px]">{rx.status || 'active'}</Badge>
                          </div>
                          <p className="text-muted-foreground">{rx.dosage} • {rx.instructions}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">Patient not found</p>
        )}
      </SheetContent>
    </Sheet>
  );
};
