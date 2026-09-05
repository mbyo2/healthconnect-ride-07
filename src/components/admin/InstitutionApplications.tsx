import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/context/UserRolesContext";
import { getCountryRequirements } from "@/config/regulatoryRequirements";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Check, X, Loader2, FileText, ExternalLink, CheckCircle,
  Building2, Globe, Activity, ShieldCheck,
} from "lucide-react";

interface InstitutionApplication {
  id: string;
  applicant_id: string;
  institution_name: string;
  institution_type: string;
  status: string;
  submitted_at: string;
  reviewer_notes: string | null;
  institution?: InstitutionDetail | null;
  applicant?: { first_name: string | null; last_name: string | null; email: string | null; country: string | null } | null;
}

interface InstitutionDetail {
  id: string;
  license_number: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  is_verified: boolean;
  // new migration fields
  list_in_marketplace: boolean | null;
  number_of_beds: number | null;
  number_of_staff: number | null;
  emergency_services: boolean | null;
  ambulance_services: boolean | null;
  is_24_7: boolean | null;
  services_offered: string[] | null;
  equipment_available: string[] | null;
  specialties: string[] | null;
  languages_spoken: string[] | null;
  accreditation_body: string | null;
  accreditation_number: string | null;
  accreditation_expiry_date: string | null;
  operational_since: string | null;
  status: string | null;
}

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-extrabold uppercase text-[#676879]">{label}</span>
    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{value || "—"}</span>
  </div>
);

const BoolBadge = ({
  value, trueLabel = "Yes", falseLabel = "No",
}: { value: boolean | null | undefined; trueLabel?: string; falseLabel?: string }) => (
  value
    ? <Badge className="bg-[#00c875]/15 text-[#00c875] border-0 text-xs">{trueLabel}</Badge>
    : <Badge variant="outline" className="text-xs text-[#676879]">{falseLabel}</Badge>
);

const TagList = ({ items, emptyLabel = "None listed" }: { items: string[] | null | undefined; emptyLabel?: string }) => (
  <div className="flex flex-wrap gap-1.5 mt-1">
    {(items || []).length > 0
      ? (items as string[]).map(item => <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>)
      : <span className="text-xs text-[#676879]">{emptyLabel}</span>
    }
  </div>
);

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

      const applicantIds = (data as any[] || []).map(a => a.applicant_id);

      const [{ data: profiles }, { data: institutions }] = await Promise.all([
        applicantIds.length
          ? supabase
              .from("profiles")
              .select("id, first_name, last_name, email, country")
              .in("id", applicantIds)
          : Promise.resolve({ data: [] as any[] }),
        applicantIds.length
          ? supabase
              .from("healthcare_institutions")
              .select(
                "id, admin_id, license_number, address, city, country, phone, email, website, is_verified, " +
                "list_in_marketplace, number_of_beds, number_of_staff, emergency_services, " +
                "ambulance_services, is_24_7, services_offered, equipment_available, specialties, " +
                "languages_spoken, accreditation_body, accreditation_number, accreditation_expiry_date, " +
                "operational_since, status"
              )
              .in("admin_id", applicantIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const merged = (data as any[] || []).map(a => ({
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

  if (!canReview) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-xs font-bold text-destructive">
        You do not have permission to review institution applications. Only Admin and Super Admin users can approve submissions.
      </div>
    );
  }

  const openReview = async (app: InstitutionApplication) => {
    setSelected(app);
    setNotes(app.reviewer_notes || "");
    setDocUrls([]);
    setDocumentChecks({});

    const country = app.institution?.country || app.applicant?.country || "ZM";
    const isPharmacy = app.institution_type?.toLowerCase().includes("pharm");
    const entityType = isPharmacy ? "pharmacies" : "institutions";
    const requirements = getCountryRequirements(country, entityType);
    const checks: Record<string, boolean> = {};
    requirements.forEach(req => { checks[req.id] = false; });
    setDocumentChecks(checks);

    const { data: files } = await supabase.storage
      .from("registration_documents")
      .list(app.applicant_id, { limit: 50 });

    if (files?.length) {
      const out: Array<{ name: string; url: string }> = [];
      for (const f of files) {
        const { data } = await supabase.storage
          .from("registration_documents")
          .createSignedUrl(`${app.applicant_id}/${f.name}`, 3600);
        if (data?.signedUrl) out.push({ name: f.name, url: data.signedUrl });
      }
      setDocUrls(out);
    }
  };

  const decide = async (status: "approved" | "rejected") => {
    if (!selected || !canReview) return;

    if (status === "approved") {
      const country = selected.institution?.country || selected.applicant?.country || "ZM";
      const isPharmacy = selected.institution_type?.toLowerCase().includes("pharm");
      const requirements = getCountryRequirements(country, isPharmacy ? "pharmacies" : "institutions");
      const allRequired = requirements.filter(r => r.required).every(r => documentChecks[r.id]);
      if (!allRequired) {
        toast.error("Please verify all required documents before approving.");
        return;
      }
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: appErr } = await supabase
        .from("institution_applications" as any)
        .update({ status, reviewer_notes: notes || null, reviewed_at: new Date().toISOString() })
        .eq("id", selected.id);
      if (appErr) throw appErr;

      if (status === "approved") {
        await supabase
          .from("healthcare_institutions")
          .update({ is_verified: true })
          .eq("admin_id", selected.applicant_id);
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

      toast.success(`Institution application ${status === "approved" ? "approved ✓" : "rejected"}`);
      setSelected(null);
      fetchApps();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setProcessing(false);
    }
  };

  const inst = selected?.institution;
  const app = selected;

  return (
    <div className="space-y-4 font-sans text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#e6e9ef] pb-3">
        <h2 className="text-base font-extrabold flex items-center gap-2 mr-auto">
          <Building2 className="h-5 w-5 text-[#0073ea]" />
          Institution Accreditation Applications
        </h2>
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-[#e6e9ef] rounded-xl">
          {(["pending", "approved", "rejected"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-extrabold capitalize transition-all ${
                filter === f
                  ? f === "approved" ? "bg-[#00c875] text-white"
                    : f === "rejected" ? "bg-[#e2445c] text-white"
                    : "bg-[#0073ea] text-white"
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
        <div className="text-center py-8 text-xs text-[#676879] font-bold">
          No {filter} institution applications found.
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-[#e6e9ef] bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
                <th className="py-2.5 px-4">Institution</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Applicant</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">License #</th>
                <th className="py-2.5 px-3 text-center">Marketplace</th>
                <th className="py-2.5 px-3">Submitted</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e9ef]">
              {apps.map(a => (
                <tr key={a.id} className="hover:bg-[#f0f2f7] transition-colors">
                  <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-slate-100">{a.institution_name}</td>
                  <td className="py-3 px-3 text-[#676879] capitalize">{a.institution_type}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold">{a.applicant?.first_name} {a.applicant?.last_name}</div>
                    <div className="text-[10px] text-slate-400">{a.applicant?.email}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-500">{a.institution?.city || "—"}, {a.institution?.country || "—"}</td>
                  <td className="py-3 px-3 font-mono">{a.institution?.license_number || "—"}</td>
                  <td className="py-3 px-3 text-center">
                    {a.institution?.list_in_marketplace
                      ? <Badge className="bg-[#0073ea]/10 text-[#0073ea] border-0 text-xs">Listed</Badge>
                      : <Badge variant="outline" className="text-xs text-[#676879]">HMS Only</Badge>
                    }
                  </td>
                  <td className="py-3 px-3 text-slate-500">{new Date(a.submitted_at).toLocaleDateString()}</td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => openReview(a)}
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

      {/* ── Review Modal ── */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-[#e6e9ef]">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">
              Review — {app?.institution_name}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5 text-xs">

              {/* Basic info */}
              <section className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl bg-[#f5f6f8] border border-[#e6e9ef]">
                <InfoRow label="Applicant" value={`${app?.applicant?.first_name || ""} ${app?.applicant?.last_name || ""}`.trim()} />
                <InfoRow label="Email" value={app?.applicant?.email} />
                <InfoRow label="Phone" value={inst?.phone} />
                <InfoRow label="License #" value={inst?.license_number} />
                <InfoRow label="Website" value={inst?.website} />
                <InfoRow label="Operational Since" value={inst?.operational_since} />
                <div className="col-span-2 md:col-span-3">
                  <InfoRow label="Address" value={[inst?.address, inst?.city, inst?.country].filter(Boolean).join(", ")} />
                </div>
              </section>

              {/* Marketplace status — prominent */}
              <section className="p-4 rounded-xl border-2 border-[#0073ea]/30 bg-[#e8f1ff] dark:bg-[#0073ea]/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#0073ea]" />
                    <span className="font-extrabold text-[#0073ea]">Marketplace Listing Preference</span>
                  </div>
                  {inst?.list_in_marketplace
                    ? <Badge className="bg-[#0073ea] text-white border-0">List in Public Marketplace</Badge>
                    : <Badge variant="outline" className="border-[#0073ea] text-[#0073ea]">HMS Internal Use Only</Badge>
                  }
                </div>
                <p className="text-[#676879] mt-1.5 text-[11px]">
                  {inst?.list_in_marketplace
                    ? "This institution wants to be discoverable by patients in public searches."
                    : "This institution will only use the platform for internal HMS operations — it should not appear in public listings."}
                </p>
              </section>

              {/* Operational details */}
              <section>
                <h4 className="font-extrabold uppercase text-[#676879] flex items-center gap-1.5 mb-2">
                  <Activity className="h-4 w-4" /> Operational Details
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl bg-[#f5f6f8] border border-[#e6e9ef]">
                  <InfoRow label="Number of Beds" value={inst?.number_of_beds} />
                  <InfoRow label="Total Staff" value={inst?.number_of_staff} />
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#676879]">Emergency Services</span>
                    <div className="mt-1"><BoolBadge value={inst?.emergency_services} trueLabel="Available" falseLabel="Not offered" /></div>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#676879]">Ambulance Services</span>
                    <div className="mt-1"><BoolBadge value={inst?.ambulance_services} trueLabel="Available" falseLabel="Not offered" /></div>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#676879]">Open 24/7</span>
                    <div className="mt-1"><BoolBadge value={inst?.is_24_7} /></div>
                  </div>
                </div>
              </section>

              {/* Services & equipment */}
              <section>
                <h4 className="font-extrabold uppercase text-[#676879] flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="h-4 w-4" /> Services & Equipment
                </h4>
                <div className="space-y-3 p-4 rounded-xl bg-[#f5f6f8] border border-[#e6e9ef]">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#676879]">Services Offered</span>
                    <TagList items={inst?.services_offered} emptyLabel="None listed" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#676879]">Equipment Available</span>
                    <TagList items={inst?.equipment_available} emptyLabel="None listed" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#676879]">Medical Specialties</span>
                    <TagList items={inst?.specialties} emptyLabel="None listed" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#676879]">Languages Spoken</span>
                    <TagList items={inst?.languages_spoken} emptyLabel="None listed" />
                  </div>
                </div>
              </section>

              {/* Accreditation */}
              {(inst?.accreditation_body || inst?.accreditation_number) && (
                <section>
                  <h4 className="font-extrabold uppercase text-[#676879] flex items-center gap-1.5 mb-2">
                    <CheckCircle className="h-4 w-4" /> Accreditation
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl bg-[#f5f6f8] border border-[#e6e9ef]">
                    <InfoRow label="Accrediting Body" value={inst?.accreditation_body} />
                    <InfoRow label="Accreditation Number" value={inst?.accreditation_number} />
                    <InfoRow label="Expiry Date" value={inst?.accreditation_expiry_date} />
                  </div>
                </section>
              )}

              {/* Document checklist */}
              <section>
                <h4 className="font-extrabold uppercase text-[#676879] mb-2">
                  Document Verification Checklist
                </h4>
                <div className="space-y-2">
                  {(() => {
                    const country = inst?.country || app?.applicant?.country || "ZM";
                    const isPharmacy = app?.institution_type?.toLowerCase().includes("pharm");
                    return getCountryRequirements(country, isPharmacy ? "pharmacies" : "institutions").map(req => (
                      <div key={req.id} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[#e6e9ef] bg-white dark:bg-slate-800">
                        <Checkbox
                          id={`chk-${req.id}`}
                          checked={documentChecks[req.id] || false}
                          onCheckedChange={checked =>
                            setDocumentChecks(prev => ({ ...prev, [req.id]: checked as boolean }))
                          }
                          disabled={processing}
                        />
                        <div className="flex-1">
                          <label htmlFor={`chk-${req.id}`} className="font-bold cursor-pointer flex items-center gap-1">
                            {req.name} {req.required && <span className="text-[#e2445c]">*</span>}
                          </label>
                          <p className="text-[10px] text-[#676879] mt-0.5">{req.description}</p>
                        </div>
                        {documentChecks[req.id] && <CheckCircle className="h-4 w-4 text-[#00c875] shrink-0" />}
                      </div>
                    ));
                  })()}
                </div>
              </section>

              {/* Uploaded documents */}
              {docUrls.length > 0 && (
                <section>
                  <h4 className="font-extrabold uppercase text-[#676879] mb-2">
                    Uploaded Documents ({docUrls.length})
                  </h4>
                  <ul className="space-y-1">
                    {docUrls.map(d => (
                      <li key={d.name} className="flex items-center justify-between p-2 border border-[#e6e9ef] rounded-md">
                        <span className="truncate flex-1 font-medium text-xs">{d.name}</span>
                        <a href={d.url} target="_blank" rel="noopener noreferrer"
                          className="text-[#0073ea] font-bold flex items-center gap-1 ml-2 text-xs shrink-0">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {docUrls.length === 0 && (
                <p className="text-xs text-[#676879] italic">No documents uploaded yet.</p>
              )}

              {/* Review notes */}
              <section>
                <label className="font-extrabold uppercase text-[#676879]">Review Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Reason / notes (required for rejection)"
                  className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-medium text-xs"
                />
              </section>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <button onClick={() => setSelected(null)} disabled={processing} className="px-3 py-1.5 text-xs font-bold text-slate-500">
              Cancel
            </button>
            <button
              onClick={() => decide("rejected")}
              disabled={processing || !notes.trim()}
              className="px-4 py-1.5 rounded-md bg-[#e2445c] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </button>
            <button
              onClick={() => decide("approved")}
              disabled={processing || docUrls.length === 0}
              className="px-4 py-1.5 rounded-md bg-[#00c875] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-40"
            >
              {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve Institution
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstitutionApplications;
