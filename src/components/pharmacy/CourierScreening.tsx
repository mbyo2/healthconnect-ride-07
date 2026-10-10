import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldCheck, FileText, Car, HeartPulse, GraduationCap,
  CheckCircle, XCircle, Clock, AlertTriangle, Upload,
} from "lucide-react";

interface Screening {
  id: string;
  courier_id: string;
  nrc_verified: boolean;
  drivers_license_verified: boolean;
  vehicle_inspection_passed: boolean;
  background_check_status: string;
  medical_fitness_verified: boolean;
  training_completed: boolean;
  training_score: number | null;
  pharmacy_approved: boolean;
  platform_approved: boolean;
  screening_status: string;
  rejection_reason: string | null;
  courier?: { full_name: string; phone: string; vehicle_type: string };
}

const CHECKS = [
  { key: "nrc_verified", label: "NRC verified", icon: FileText, level: "Yango" },
  { key: "drivers_license_verified", label: "Driver's license verified", icon: FileText, level: "Yango" },
  { key: "vehicle_inspection_passed", label: "Vehicle inspection passed", icon: Car, level: "Yango" },
  { key: "background_check_status", label: "Background check passed", icon: ShieldCheck, level: "Yango", custom: (s: Screening) => s.background_check_status === "passed" },
  { key: "medical_fitness_verified", label: "Medical fitness certificate", icon: HeartPulse, level: "Beyond" },
  { key: "training_completed", label: "Medicine-handling training", icon: GraduationCap, level: "Beyond" },
];

export const CourierScreening = ({ pharmacyId }: { pharmacyId: string }) => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: screenings = [], isLoading } = useQuery({
    queryKey: ["courier-screenings", pharmacyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("courier_screenings")
        .select("*, courier:couriers!inner(id, full_name, phone, vehicle_type, pharmacy_id)")
        .eq("courier.pharmacy_id", pharmacyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Screening[];
    },
    enabled: !!pharmacyId,
  });

  const getProgress = (s: Screening) => {
    const done = CHECKS.filter((c) =>
      c.custom ? c.custom(s) : (s as any)[c.key] === true
    ).length;
    return { done, total: CHECKS.length };
  };

  const handleApprove = async (s: Screening, level: "pharmacy" | "platform") => {
    try {
      const updates: any =
        level === "pharmacy"
          ? { pharmacy_approved: true, pharmacy_approved_at: new Date().toISOString() }
          : { platform_approved: true, platform_approved_at: new Date().toISOString() };

      // If both approvals done, mark screening approved
      const willBeFullyApproved =
        level === "pharmacy" ? s.platform_approved : s.pharmacy_approved;
      if (willBeFullyApproved) {
        updates.screening_status = "approved";
      } else {
        updates.screening_status = "under_review";
      }

      const { error } = await (supabase as any)
        .from("courier_screenings")
        .update(updates)
        .eq("id", s.id);
      if (error) throw error;

      // Activate courier if fully approved
      if (willBeFullyApproved) {
        await (supabase as any)
          .from("couriers")
          .update({ is_active: true })
          .eq("id", s.courier_id);
      }

      toast.success(
        willBeFullyApproved
          ? "Rider fully approved and activated"
          : `${level === "pharmacy" ? "Pharmacy" : "Platform"} approval recorded`
      );
      queryClient.invalidateQueries({ queryKey: ["courier-screenings", pharmacyId] });
    } catch (e: any) {
      toast.error(e.message || "Approval failed");
    }
  };

  const handleReject = async (s: Screening) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    try {
      const { error } = await (supabase as any)
        .from("courier_screenings")
        .update({ screening_status: "rejected", rejection_reason: rejectionReason.trim() })
        .eq("id", s.id);
      if (error) throw error;
      await (supabase as any)
        .from("couriers")
        .update({ is_active: false })
        .eq("id", s.courier_id);
      toast.success("Rider rejected");
      setRejectionReason("");
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["courier-screenings", pharmacyId] });
    } catch (e: any) {
      toast.error(e.message || "Rejection failed");
    }
  };

  const statusColor: Record<string, string> = {
    incomplete: "bg-gray-100 text-gray-700",
    under_review: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    suspended: "bg-orange-100 text-orange-700",
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading screenings…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Rider Screening ({screenings.length})
        </CardTitle>
        <CardDescription>
          Yango-level vetting plus medical fitness and medicine-handling training.
          Both pharmacy and platform approval required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {screenings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
            No riders awaiting screening. Riders appear here after they sign up.
          </p>
        ) : (
          <div className="space-y-3">
            {screenings.map((s) => {
              const { done, total } = getProgress(s);
              const isSelected = selectedId === s.id;
              return (
                <div key={s.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{s.courier?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.courier?.phone} · {s.courier?.vehicle_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColor[s.screening_status]}>
                        {s.screening_status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {done}/{total} checks
                      </span>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                    {CHECKS.map((check) => {
                      const passed = check.custom
                        ? check.custom(s)
                        : (s as any)[check.key] === true;
                      const Icon = check.icon;
                      return (
                        <div
                          key={check.key}
                          className="flex items-center gap-2 text-sm"
                        >
                          {passed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className={passed ? "" : "text-muted-foreground"}>
                            {check.label}
                          </span>
                          <Badge variant="outline" className="ml-auto text-[10px]">
                            {check.level}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>

                  {/* Approval buttons */}
                  {s.screening_status !== "approved" && s.screening_status !== "rejected" && (
                    <div className="flex flex-wrap gap-2">
                      {!s.pharmacy_approved && (
                        <Button size="sm" onClick={() => handleApprove(s, "pharmacy")}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Pharmacy Approve
                        </Button>
                      )}
                      {s.pharmacy_approved && !s.platform_approved && (
                        <Badge variant="secondary">Awaiting platform approval</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedId(isSelected ? null : s.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {s.screening_status === "rejected" && s.rejection_reason && (
                    <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      {s.rejection_reason}
                    </p>
                  )}

                  {isSelected && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder="Rejection reason…"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                      <Button size="sm" variant="destructive" onClick={() => handleReject(s)}>
                        Confirm Rejection
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
