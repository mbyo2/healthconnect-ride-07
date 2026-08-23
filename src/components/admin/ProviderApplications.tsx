import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/context/UserRolesContext";
import { getCountryRequirements } from "@/config/regulatoryRequirements";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Check, X, Loader2, FileText, ExternalLink, CheckCircle, ShieldCheck } from "lucide-react";

interface ProviderApp {
  id: string;
  user_id: string;
  license_number: string;
  specialty: string;
  years_of_experience: number;
  status: string;
  documents_url: string[] | null;
  created_at: string;
  review_notes: string | null;
  profile?: { first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null;
}

export const ProviderApplications = () => {
  const [apps, setApps] = useState<ProviderApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [selected, setSelected] = useState<ProviderApp | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [documentChecks, setDocumentChecks] = useState<Record<string, boolean>>({});
  const { isAdmin, isSuperAdmin } = useUserRoles();
  const canReview = isAdmin || isSuperAdmin;

  const fetchApps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("health_personnel_applications")
        .select("*")
        .eq("status", filter)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = (data || []).map((a: any) => a.user_id);
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, first_name, last_name, email, phone, country, provider_type, role").in("id", userIds)
        : { data: [] as any[] };

      const merged = (data || []).map((a: any) => ({
        ...a,
        profile: (profiles || []).find((p: any) => p.id === a.user_id) || null,
      }));
      setApps(merged as ProviderApp[]);
    } catch (e: any) {
      toast.error(e.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [filter]);

  if (!canReview) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-xs font-bold text-destructive">
        You do not have permission to review provider accreditation applications.
      </div>
    );
  }

  const openReview = async (app: ProviderApp) => {
    setSelected(app);
    setNotes(app.review_notes || "");
    setDocUrls({});
    setDocumentChecks({});

    const country = (app.profile as any)?.country || "ZM";
    const requirements = getCountryRequirements(country, "healthcareProfessionals");

    const checks: Record<string, boolean> = {};
    requirements.forEach((req) => {
      checks[req.id] = false;
    });
    setDocumentChecks(checks);

    if (app.documents_url?.length) {
      const urls: Record<string, string> = {};
      for (const path of app.documents_url) {
        const { data } = await supabase.storage.from("registration_documents").createSignedUrl(path, 3600);
        if (data?.signedUrl) urls[path] = data.signedUrl;
      }
      setDocUrls(urls);
    }
  };

  const decide = async (status: "approved" | "rejected") => {
    if (!selected) return;
    if (!canReview) {
      toast.error("Only admin or superadmin users can approve applications.");
      return;
    }

    if (status === "approved") {
      const country = (selected.profile as any)?.country || "ZM";
      const requirements = getCountryRequirements(country, "healthcareProfessionals");
      const requiredDocs = requirements.filter((req) => req.required);

      const allRequiredChecked = requiredDocs.every((req) => documentChecks[req.id] === true);
      if (!allRequiredChecked) {
        toast.error("Please verify all required documents before approving.");
        return;
      }
    }

    setProcessing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("health_personnel_applications")
        .update({
          status,
          review_notes: notes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selected.id);
      if (error) throw error;

      if (status === "approved") {
        await supabase.from("profiles").update({ is_verified: true }).eq("id", selected.user_id);
      }

      toast.success(`Application marked as ${status}`);
      setSelected(null);
      fetchApps();
    } catch (e: any) {
      toast.error(e.message || "Failed to update decision");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusPill = (st: string) => {
    switch (st) {
      case "approved":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">Approved</span>;
      case "rejected":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#e2445c]">Rejected</span>;
      default:
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#fdab3d]">Pending Verification</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between border-b border-[#e6e9ef] pb-3">
        <h2 className="text-base font-extrabold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#0073ea]" />
          Practitioner Accreditation Applications
        </h2>
        <div className="flex items-center gap-1.5">
          {(["pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-extrabold capitalize transition-all ${
                filter === f
                  ? "bg-[#0073ea] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#e5f0ff]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8 text-xs font-bold text-slate-400">Loading accreditation queue...</div>
      ) : apps.length === 0 ? (
        <div className="p-8 text-center text-xs text-[#676879] bg-[#f5f6f8] rounded-xl border border-[#e6e9ef]">
          No {filter} provider accreditation applications found.
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-[#e6e9ef] bg-white dark:bg-slate-900">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
                <th className="py-2.5 px-4">Applicant Name</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Specialty</th>
                <th className="py-2.5 px-3">License Number</th>
                <th className="py-2.5 px-3">Experience</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e9ef]">
              {apps.map((app) => (
                <tr key={app.id} className="hover:bg-[#f0f2f7] transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                    <div>{app.profile?.first_name} {app.profile?.last_name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{app.profile?.email}</div>
                  </td>
                  <td className="py-3 px-3 text-center">{getStatusPill(app.status)}</td>
                  <td className="py-3 px-3 font-semibold text-[#0073ea]">{app.specialty || "General Medicine"}</td>
                  <td className="py-3 px-3 font-mono">{app.license_number || "—"}</td>
                  <td className="py-3 px-3 font-bold">{app.years_of_experience} Yrs</td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => openReview(app)}
                      className="px-3 py-1 rounded-md bg-[#0073ea] text-white text-[11px] font-bold hover:bg-[#0060c4]"
                    >
                      Review Docs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-[#e6e9ef]">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">Review Practitioner Accreditation</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#f5f6f8] border border-[#e6e9ef]">
                <div><strong className="text-[#676879]">Name:</strong> {selected.profile?.first_name} {selected.profile?.last_name}</div>
                <div><strong className="text-[#676879]">Email:</strong> {selected.profile?.email}</div>
                <div><strong className="text-[#676879]">Specialty:</strong> {selected.specialty}</div>
                <div><strong className="text-[#676879]">License #:</strong> {selected.license_number || "—"}</div>
              </div>

              <div>
                <h4 className="font-extrabold mb-2 uppercase text-[#676879]">Document Verification Checklist</h4>
                <div className="space-y-2">
                  {getCountryRequirements((selected.profile as any)?.country || "ZM", "healthcareProfessionals").map((req) => (
                    <div key={req.id} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[#e6e9ef] bg-[#f5f6f8]">
                      <Checkbox
                        id={`doc-check-${req.id}`}
                        checked={documentChecks[req.id] || false}
                        onCheckedChange={(checked) =>
                          setDocumentChecks((prev) => ({ ...prev, [req.id]: checked as boolean }))
                        }
                        disabled={processing}
                      />
                      <div className="flex-1">
                        <label htmlFor={`doc-check-${req.id}`} className="font-bold text-xs cursor-pointer flex items-center gap-1">
                          {req.name} {req.required && <span className="text-[#e2445c]">*</span>}
                        </label>
                        <p className="text-[10px] text-[#676879] mt-0.5">{req.description}</p>
                      </div>
                      {documentChecks[req.id] && <CheckCircle className="h-4 w-4 text-[#00c875]" />}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-extrabold uppercase text-[#676879]">Review Notes</label>
                <textarea
                  rows={2}
                  className="w-full mt-1 p-2.5 rounded-md border border-[#c3c6d4] bg-[#f5f6f8] text-xs font-medium"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Accreditation note (required for rejection)..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => setSelected(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500">
              Cancel
            </button>
            <button
              onClick={() => decide("rejected")}
              disabled={processing || !notes.trim()}
              className="px-4 py-1.5 rounded-md bg-[#e2445c] text-white text-xs font-bold disabled:opacity-40"
            >
              Reject Application
            </button>
            <button
              onClick={() => decide("approved")}
              disabled={processing}
              className="px-4 py-1.5 rounded-md bg-[#00c875] text-white text-xs font-bold disabled:opacity-40"
            >
              Approve & Verify Provider
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderApplications;
