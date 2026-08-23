import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/context/UserRolesContext";
import { getCountryRequirements } from "@/config/regulatoryRequirements";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Check, X, Loader2, FileText, ExternalLink, CheckCircle, Building2 } from "lucide-react";

interface InstitutionApplication {
  id: string;
  applicant_id: string;
  institution_name: string;
  institution_type: string;
  status: string;
  submitted_at: string;
  reviewer_notes: string | null;
  institution?: {
    id: string;
    license_number: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
    is_verified: boolean;
  } | null;
  applicant?: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

export const InstitutionApplications = () => {
  const [apps, setApps] = useState<InstitutionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [selected, setSelected] = useState<InstitutionApplication | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [docUrls, setDocUrls] = useState<Array<{ name: string; url: string }>>([]);
  const [documentChecks, setDocumentChecks] = useState<Record<string, boolean>>({});
  const { isAdmin, isSuperAdmin } = useUserRoles();
  const canReview = isAdmin || isSuperAdmin;

  const fetchApps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("institution_applications" as any)
        .select("*")
        .eq("status", filter)
        .order("submitted_at", { ascending: false });
      if (error) throw error;

      const ids = (data as any[] || []).map((a) => a.applicant_id);
      const [{ data: profiles }, { data: institutions }] = await Promise.all([
        ids.length
          ? supabase.from("profiles").select("id, first_name, last_name, email, country").in("id", ids)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from("healthcare_institutions").select("id, admin_id, license_number, address, city, country, phone, email, is_verified").in("admin_id", ids)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const merged = (data as any[] || []).map((a) => ({
        ...a,
        applicant: (profiles || []).find((p: any) => p.id === a.applicant_id) || null,
        institution: (institutions || []).find((i: any) => i.admin_id === a.applicant_id) || null,
      }));
      setApps(merged as InstitutionApplication[]);
    } catch (e: any) {
      toast.error(e.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApps(); }, [filter]);

  const openReview = async (app: InstitutionApplication) => {
    setSelected(app);
    setNotes(app.reviewer_notes || "");
    setDocUrls([]);
    setDocumentChecks({});

    const country = app.institution?.country || (app.applicant as any)?.country || "ZM";
    const isPharmacy = app.institution_type?.toLowerCase().includes("pharm");
    const entityType = isPharmacy ? "pharmacies" : "institutions";
    const requirements = getCountryRequirements(country, entityType);

    const checks: Record<string, boolean> = {};
    requirements.forEach((req) => { checks[req.id] = false; });
    setDocumentChecks(checks);

    const { data: files } = await supabase.storage.from("registration_documents").list(app.applicant_id, { limit: 50 });
    if (files?.length) {
      const out: Array<{ name: string; url: string }> = [];
      for (const f of files) {
        const { data } = await supabase.storage.from("registration_documents").createSignedUrl(`${app.applicant_id}/${f.name}`, 3600);
        if (data?.signedUrl) out.push({ name: f.name, url: data.signedUrl });
      }
      setDocUrls(out);
    }
  };

  const decide = async (status: "approved" | "rejected") => {
    if (!selected || !canReview) return;

    if (status === "approved") {
      const country = selected.institution?.country || (selected.applicant as any)?.country || "ZM";
      const isPharmacy = selected.institution_type?.toLowerCase().includes("pharm");
      const entityType = isPharmacy ? "pharmacies" : "institutions";
      const requirements = getCountryRequirements(country, entityType);
      const requiredDocs = requirements.filter((req) => req.required);
      const allRequiredChecked = requiredDocs.every((req) => documentChecks[req.id] === true);
      if (!allRequiredChecked) {
        toast.error("Please verify all required documents before approving.");
        return;
      }
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: appErr } = await supabase.from("institution_applications" as any).update({ status, reviewer_notes: notes || null, reviewed_at: new Date().toISOString() }).eq("id", selected.id);
      if (appErr) throw appErr;

      if (status === "approved") {
        await supabase.from("healthcare_institutions").update({ is_verified: true }).eq("admin_id", selected.applicant_id);
        await supabase.from("profiles").update({ is_verified: true }).eq("id", selected.applicant_id);
      }

      await supabase.from("audit_logs" as any).insert({
        user_id: user?.id,
        action: status === "approved" ? "approve_institution" : "reject_institution",
        resource: "institution_application",
        resource_id: selected.id,
        details: { institution_name: selected.institution_name, notes },
        category: "admin_action",
        outcome: "success",
        severity: "info",
      });

      toast.success(`Institution Application ${status === "approved" ? "Approved ✓" : "Rejected"}`);
      setSelected(null);
      fetchApps();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setProcessing(false);
    }
  };

  if (!canReview) {
    return (
      <div className="rounded-xl border border-[#e2445c]/20 bg-[#e2445c]/5 p-6 text-sm text-[#e2445c] font-bold">
        You do not have permission to review institution applications. Only Admin and Super Admin users can approve submissions.
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#e6e9ef] pb-3">
        <h2 className="text-base font-extrabold flex items-center gap-2 mr-auto">
          <Building2 className="h-5 w-5 text-[#0073ea]" />
          Institution Accreditation Applications
        </h2>
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-[#e6e9ef] rounded-xl">
          {(["pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-extrabold capitalize transition-all ${
                filter === f
                  ? f === "approved" ? "bg-[#00c875] text-white" : f === "rejected" ? "bg-[#e2445c] text-white" : "bg-[#0073ea] text-white"
                  : "text-[#676879] hover:bg-[#f0f2f7]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#0073ea]" /></div>
      ) : apps.length === 0 ? (
        <div className="text-center py-8 text-xs text-[#676879] font-bold">No {filter} institution applications found.</div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-[#e6e9ef] bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
                <th className="py-2.5 px-4">Institution Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Applicant Email</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">License #</th>
                <th className="py-2.5 px-3">Submitted</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e9ef]">
              {apps.map((app) => (
                <tr key={app.id} className="hover:bg-[#f0f2f7] transition-colors">
                  <td className="py-3 px-4 font-extrabold text-slate-900">{app.institution_name}</td>
                  <td className="py-3 px-3 text-[#676879] capitalize">{app.institution_type}</td>
                  <td className="py-3 px-3 text-[#0073ea] font-bold">{app.applicant?.email || "—"}</td>
                  <td className="py-3 px-3 text-slate-500">{app.institution?.city || "—"}, {app.institution?.country || "—"}</td>
                  <td className="py-3 px-3 font-mono">{app.institution?.license_number || "—"}</td>
                  <td className="py-3 px-3 text-slate-500">{new Date(app.submitted_at).toLocaleDateString()}</td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => openReview(app)}
                      className="px-3 py-1 rounded-md bg-[#0073ea] text-white text-[10px] font-bold flex items-center gap-1 mx-auto"
                    >
                      <FileText className="h-3 w-3" /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-[#e6e9ef]">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">Review — {selected?.institution_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[#f5f6f8]">
                <div><span className="font-extrabold text-[#676879] uppercase">Applicant</span><div className="font-bold mt-1">{selected.applicant?.first_name} {selected.applicant?.last_name}</div></div>
                <div><span className="font-extrabold text-[#676879] uppercase">Email</span><div className="font-bold text-[#0073ea] mt-1">{selected.applicant?.email}</div></div>
                <div><span className="font-extrabold text-[#676879] uppercase">License #</span><div className="font-bold mt-1">{selected.institution?.license_number || "—"}</div></div>
                <div><span className="font-extrabold text-[#676879] uppercase">Phone</span><div className="font-bold mt-1">{selected.institution?.phone || "—"}</div></div>
                <div className="col-span-2"><span className="font-extrabold text-[#676879] uppercase">Address</span><div className="font-bold mt-1">{selected.institution?.address || "—"}, {selected.institution?.city || ""} {selected.institution?.country || ""}</div></div>
              </div>

              <div>
                <h4 className="font-extrabold text-[#676879] uppercase mb-2">Document Verification Checklist</h4>
                <div className="space-y-2">
                  {(() => {
                    const country = selected.institution?.country || (selected.applicant as any)?.country || "ZM";
                    const isPharmacy = selected.institution_type?.toLowerCase().includes("pharm");
                    const entityType = isPharmacy ? "pharmacies" : "institutions";
                    return getCountryRequirements(country, entityType).map((req) => (
                      <div key={req.id} className="flex items-start gap-3 p-3 border border-[#e6e9ef] rounded-xl bg-white">
                        <Checkbox
                          id={`doc-check-${req.id}`}
                          checked={documentChecks[req.id] || false}
                          onCheckedChange={(checked) => setDocumentChecks((prev) => ({ ...prev, [req.id]: checked as boolean }))}
                          disabled={processing}
                        />
                        <div className="flex-1">
                          <label htmlFor={`doc-check-${req.id}`} className="font-extrabold cursor-pointer flex items-center gap-2">
                            {req.name} {req.required && <span className="text-[#e2445c]">*</span>}
                          </label>
                          <p className="text-[#676879] mt-0.5">{req.description}</p>
                        </div>
                        {documentChecks[req.id] && <CheckCircle className="h-4 w-4 text-[#00c875]" />}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-[#676879] uppercase mb-2">Uploaded Documents ({docUrls.length})</h4>
                {docUrls.length ? (
                  <ul className="space-y-1">
                    {docUrls.map((d) => (
                      <li key={d.name} className="flex items-center justify-between p-2 border border-[#e6e9ef] rounded-md">
                        <span className="truncate flex-1 font-bold">{d.name}</span>
                        <a href={d.url} target="_blank" rel="noopener" className="text-[#0073ea] font-bold flex items-center gap-1 ml-2">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[#676879]">No documents uploaded yet.</p>
                )}
              </div>

              <div>
                <label className="font-extrabold text-[#676879] uppercase">Review Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Reason / notes (required for rejection)"
                  className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-medium text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <button onClick={() => setSelected(null)} disabled={processing} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
            <button
              onClick={() => decide("rejected")}
              disabled={processing || !notes.trim()}
              className="px-4 py-1.5 rounded-md bg-[#e2445c] text-white text-xs font-bold flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </button>
            <button
              onClick={() => decide("approved")}
              disabled={processing || docUrls.length === 0}
              className="px-4 py-1.5 rounded-md bg-[#00c875] text-white text-xs font-bold flex items-center gap-1"
            >
              <Check className="h-3.5 w-3.5" /> Approve Institution
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstitutionApplications;
