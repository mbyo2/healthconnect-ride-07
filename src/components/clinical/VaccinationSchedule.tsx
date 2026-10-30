import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Syringe, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { friendlyErrorMessage } from "@/utils/friendly-error";

interface ScheduleRow {
  id: string;
  vaccine_name: string;
  schedule_key: string;
  dose_number: number;
  due_age_days: number;
  due_age_label: string;
  notes: string | null;
}

interface GivenDose {
  vaccine_name: string;
  dose_number: number;
  administered_date: string | null;
  batch_number: string | null;
  administered_by: string | null;
}

type DoseStatus = "given" | "overdue" | "due-soon" | "upcoming";

/**
 * EPI Vaccination Schedule Tracker (Zambia)
 * Computes each vaccine-dose's status from the child's date of birth
 * and the doses recorded in immunizations.
 */
export default function VaccinationSchedule({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient();
  const [marking, setMarking] = useState<ScheduleRow | null>(null);
  const [batchNumber, setBatchNumber] = useState("");
  const [givenDate, setGivenDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: profile } = useQuery({
    queryKey: ["epi-profile", patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("date_of_birth")
        .eq("id", patientId)
        .single();
      return data as { date_of_birth: string | null } | null;
    },
    enabled: !!patientId,
  });

  const { data: schedule, isLoading: schedLoading } = useQuery({
    queryKey: ["vaccination-schedule"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vaccination_schedule")
        .select("*")
        .eq("country_code", "ZM")
        .eq("is_active", true)
        .order("due_age_days");
      if (error) throw error;
      return (data as ScheduleRow[]) || [];
    },
  });

  const { data: given, isLoading: givenLoading } = useQuery({
    queryKey: ["immunizations-given", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("immunizations")
        .select("vaccine_name, dose_number, administered_date, batch_number, administered_by")
        .eq("patient_id", patientId)
        .not("administered_date", "is", null);
      if (error) throw error;
      return (data as GivenDose[]) || [];
    },
    enabled: !!patientId,
  });

  const markMutation = useMutation({
    mutationFn: async (row: ScheduleRow) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Resolve the institution: patient's active link wins, else the
      // recording clinician's institution. Never guess an FK.
      let institutionId: string | null = null;
      const { data: link } = await supabase
        .from("patient_institution_links")
        .select("institution_id")
        .eq("patient_id", patientId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if ((link as any)?.institution_id) institutionId = (link as any).institution_id;
      if (!institutionId && user) {
        const { data: staff } = await supabase
          .from("institution_staff")
          .select("institution_id")
          .eq("provider_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if ((staff as any)?.institution_id) institutionId = (staff as any).institution_id;
      }
      if (!institutionId) {
        throw new Error("Link the patient to an institution before recording doses.");
      }

      const dueDate = profile?.date_of_birth
        ? new Date(new Date(profile.date_of_birth).getTime() + row.due_age_days * 86400000)
            .toISOString()
            .slice(0, 10)
        : givenDate;
      const { error } = await supabase.from("immunizations").insert({
        patient_id: patientId,
        vaccine_name: row.vaccine_name,
        dose_number: row.dose_number,
        scheduled_date: dueDate,
        administered_date: givenDate,
        batch_number: batchNumber || null,
        administered_by: user?.id || null,
        institution_id: institutionId,
      });
      if (error) throw error;
    },
    onError: (e: any) =>
      toast.error(friendlyErrorMessage(e, "Failed to record dose")),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["immunizations-given", patientId] });
      setMarking(null);
      setBatchNumber("");
      toast.success("Dose recorded");
    },
  });

  const doses = useMemo(() => {
    if (!profile?.date_of_birth || !schedule) return [];
    const dob = new Date(profile.date_of_birth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return schedule.map((row) => {
      const due = new Date(dob.getTime() + row.due_age_days * 86400000);
      const givenDose = (given || []).find(
        (g) =>
          g.vaccine_name.toLowerCase() === row.vaccine_name.toLowerCase() &&
          g.dose_number === row.dose_number
      );
      let status: DoseStatus = "upcoming";
      if (givenDose) status = "given";
      else if (due.getTime() < today.getTime()) status = "overdue";
      else if (due.getTime() - today.getTime() <= 14 * 86400000) status = "due-soon";
      return { row, due, status, givenDose };
    });
  }, [profile, schedule, given]);

  if (schedLoading || givenLoading) {
    return <div className="text-sm text-muted-foreground">Loading vaccination schedule...</div>;
  }

  // EPI is an under-5 programme — self-hide for older patients
  if (profile?.date_of_birth) {
    const ageDays =
      (Date.now() - new Date(profile.date_of_birth).getTime()) / 86400000;
    if (ageDays > 5 * 365) return null;
  }

  // Self-hides when DOB is missing (can't compute the schedule)
  if (!profile?.date_of_birth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            EPI Vaccination Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Date of birth is required to track vaccinations. Add it to the patient profile.
          </p>
        </CardContent>
      </Card>
    );
  }

  const overdue = doses.filter((d) => d.status === "overdue").length;
  const givenCount = doses.filter((d) => d.status === "given").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Syringe className="h-4 w-4" />
          EPI Vaccination Schedule (Zambia)
          <Badge variant="secondary" className="ml-1">
            {givenCount}/{doses.length} given
          </Badge>
          {overdue > 0 && (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {overdue} overdue
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {doses.map(({ row, due, status, givenDose }) => (
          <div
            key={row.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-xl border",
              status === "given" && "bg-green-50/60 dark:bg-green-950/20 border-green-200 dark:border-green-900",
              status === "overdue" && "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900",
              status === "due-soon" && "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 rounded-full p-1.5",
                  status === "given" && "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
                  status === "overdue" && "bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300",
                  status === "due-soon" && "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
                  status === "upcoming" && "bg-muted text-muted-foreground"
                )}
              >
                {status === "given" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Syringe className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold">
                  {row.vaccine_name}
                  {row.dose_number > 0 && (
                    <span className="font-normal text-muted-foreground"> — dose {row.dose_number}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Due {row.due_age_label} · {due.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {givenDose?.administered_date &&
                    ` · Given ${new Date(givenDose.administered_date).toLocaleDateString("en-GB")}`}
                  {givenDose?.batch_number && ` · Batch ${givenDose.batch_number}`}
                </p>
              </div>
            </div>
            {status !== "given" ? (
              <Button size="sm" variant="outline" onClick={() => setMarking(row)}>
                Mark given
              </Button>
            ) : (
              <Badge variant="default">Given</Badge>
            )}
          </div>
        ))}

        <p className="text-xs text-muted-foreground pt-2">
          Schedule: Zambia Expanded Programme on Immunization. Doses marked "overdue" need catch-up.
        </p>
      </CardContent>

      <Dialog open={!!marking} onOpenChange={(o) => !o && setMarking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Record {marking?.vaccine_name}
              {marking && marking.dose_number > 0 ? ` — dose ${marking.dose_number}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Date given</label>
              <Input
                type="date"
                value={givenDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setGivenDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Batch number (optional)</label>
              <Input
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. BCG-2026-041"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setMarking(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => marking && markMutation.mutate(marking)}
                disabled={markMutation.isPending}
              >
                {markMutation.isPending ? "Saving..." : "Record dose"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
