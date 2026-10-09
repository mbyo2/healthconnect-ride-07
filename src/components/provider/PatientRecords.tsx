import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileText, AlertTriangle, Siren, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BreakGlassDialog } from "@/components/clinical/BreakGlassDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PatientRecord {
  id: string;
  patient_id: string;
  record_type: string;
  description: string;
  date: string;
  patient: {
    first_name: string;
    last_name: string;
  } | null;
}

interface ActiveGrant {
  id: string;
  patient_id: string;
  reason: string;
  expires_at: string;
}

function displayName(p: PatientRecord["patient"]): string {
  return [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Patient";
}

export const PatientRecords = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: records, isLoading } = useQuery({
    queryKey: ['medical_records'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // NOTE: comprehensive_medical_records.patient_id FKs point at
      // auth.users, so the `profiles!..._fkey` join hint is invalid
      // PostgREST. Patient names are fetched directly — the "Appointment
      // participants can view each other's profiles" RLS policy permits
      // participant rows; others resolve to null (already handled).
      //
      // Records unlocked via break-the-glass appear here automatically:
      // the SELECT policy consults has_break_glass_access(patient_id).
      const { data, error } = await supabase
        .from('comprehensive_medical_records')
        .select(`
          id,
          patient_id,
          record_type,
          description,
          visit_date
        `)
        .order('visit_date', { ascending: false })
        .limit(100);

      if (error) throw error;

      const rows = (data as any[]) || [];
      const patientIds = [...new Set(rows.map((r) => r.patient_id).filter(Boolean))];
      let patientMap: Record<string, any> = {};
      if (patientIds.length > 0) {
        const { data: patients } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', patientIds);
        patientMap = Object.fromEntries((patients || []).map((p: any) => [p.id, p]));
      }

      return rows.map(record => ({
        id: record.id,
        patient_id: record.patient_id,
        record_type: record.record_type,
        description: record.description,
        date: record.visit_date,
        patient: patientMap[record.patient_id] || null
      })) as PatientRecord[];
    }
  });

  // Active break-glass grants held by this clinician (for the banner + revoke).
  const { data: activeGrants = [] } = useQuery({
    queryKey: ['break-glass-grants'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('emergency_access_grants')
        .select('id, patient_id, reason, expires_at')
        .eq('clinician_id', user.id)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('granted_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ActiveGrant[];
    },
  });

  const selectedPatientName = selectedPatientId
    ? displayName(records?.find((r) => r.patient_id === selectedPatientId)?.patient ?? null)
    : null;
  const selectedGrant = selectedPatientId
    ? activeGrants.find((g) => g.patient_id === selectedPatientId)
    : undefined;

  const revokeGrant = async (grantId: string) => {
    try {
      const { error } = await (supabase as any).rpc("revoke_break_glass_access", {
        p_grant_id: grantId,
      });
      if (error) throw error;
      toast.success("Emergency access revoked.");
      queryClient.invalidateQueries({ queryKey: ['break-glass-grants'] });
      queryClient.invalidateQueries({ queryKey: ['medical_records'] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to revoke access");
    }
  };

  const filteredRecords = records?.filter(record => {
    // patient join can be null under RLS (walk-in records) — never crash
    const first = record.patient?.first_name?.toLowerCase() || "";
    const last = record.patient?.last_name?.toLowerCase() || "";
    const q = searchTerm.toLowerCase();
    return first.includes(q) || last.includes(q);
  });

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-semibold">Patient Records</h2>
        <div className="flex gap-4 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 min-h-[44px]"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setDialogOpen(true)}
            title={
              selectedPatientId
                ? `Emergency access for ${selectedPatientName}`
                : "Find a patient and request emergency access"
            }
            className="border-red-200 text-red-700 hover:bg-red-50 min-h-[44px]"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Emergency Access
          </Button>
          <Button onClick={() => navigate("/medical-records")} className="min-h-[44px]">
            <FileText className="w-4 h-4 mr-2" />
            New Record
          </Button>
        </div>
      </div>

      {/* Active break-glass grant for the selected patient */}
      {selectedGrant && (
        <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-center gap-3 flex-wrap">
          <Siren className="h-5 w-5 text-amber-600 shrink-0" aria-hidden />
          <p className="text-sm flex-1 min-w-[200px]">
            <strong className="text-amber-700 dark:text-amber-300">Emergency access active</strong>
            {" "}for {selectedPatientName} — expires{" "}
            {new Date(selectedGrant.expires_at).toLocaleString()}. All access is audit-logged.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => revokeGrant(selectedGrant.id)}
            className="min-h-[44px] border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Revoke now
          </Button>
        </div>
      )}

      {selectedPatientId && !selectedGrant && (
        <p className="mb-4 text-xs text-muted-foreground" aria-live="polite">
          Selected patient: <strong className="text-foreground">{selectedPatientName}</strong>
          {" "}— click Emergency Access to request break-the-glass access, or click the row again to deselect.
        </p>
      )}

      <BreakGlassDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={selectedPatientId ?? undefined}
        patientName={selectedPatientName ?? undefined}
        onGranted={() => {
          // Newly unlocked records appear via the RLS-aware query — no reload.
          queryClient.invalidateQueries({ queryKey: ['medical_records'] });
          queryClient.invalidateQueries({ queryKey: ['break-glass-grants'] });
        }}
      />

      {isLoading ? (
        <div className="text-center py-4">Loading records...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>Record Type</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords?.map((record) => {
              const isSelected = record.patient_id === selectedPatientId;
              return (
                <TableRow
                  key={record.id}
                  onClick={() => setSelectedPatientId(isSelected ? null : record.patient_id)}
                  aria-selected={isSelected}
                  className={cn(
                    "cursor-pointer",
                    isSelected && "bg-red-50 dark:bg-red-950/30 hover:bg-red-50 dark:hover:bg-red-950/30"
                  )}
                >
                  <TableCell>{record.date ? new Date(record.date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="font-medium">{displayName(record.patient)}</TableCell>
                  <TableCell>{record.record_type}</TableCell>
                  <TableCell>{record.description}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
};
