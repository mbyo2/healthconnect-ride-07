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
  ShieldCheck, GraduationCap, DollarSign, Video, Home,
  Building2, Languages, Award, Stethoscope,
} from "lucide-react";

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
  // joined from profiles
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    country: string | null;
    // new enhancement fields
    medical_school: string | null;
    graduation_year: number | null;
    board_certifications: string[] | null;
    subspecialties: string[] | null;
    primary_practice_location: string | null;
    affiliated_hospitals: string[] | null;
    consultation_fee_min: number | null;
    consultation_fee_max: number | null;
    accepts_insurance: boolean | null;
    insurance_providers_accepted: string[] | null;
    telemedicine_available: boolean | null;
    home_visits_available: boolean | null;
    languages_spoken: string[] | null;
    typical_wait_time: string | null;
  } | null;
}

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-extrabold uppercase text-[#676879]">{label}</span>
    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{value || "—"}</span>
  </div>
);

const BoolBadge = ({ value, trueLabel = "Yes", falseLabel = "No" }: { value: boolean | null; trueLabel?: string; falseLabel?: string }) => (
  value
    ? <Badge className="bg-[#00c875]/15 text-[#00c875] border-0 text-xs">{trueLabel}</Badge>
    : <Badge variant="outline" className="text-xs text-[#676879]">{falseLabel}</Badge>
);

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
        ? await supabase
            .from("profiles")
            .select(
              "id, first_name, last_name, email, phone, country, provider_type, role, " +
              "medical_school, graduation_year, board_certifications, subspecialties, " +
              "primary_practice_location, affiliated_hospitals, " +
              "consultation_fee_min, consultation_fee_max, accepts_insurance, " +
              "insurance_providers_accepted, telemedicine_available, home_visits_available, " +
              "languages_spoken, typical_wait_time"
            )
            .in("id", userIds)
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

  useEffect(() => { fetchApps(); }, [filter]);

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

    const country = app.profile?.country || "ZM";
    const requirements = getCountryRequirements(country, "healthcareProfessionals");
    const checks: Record<string, boolean> = {};
    requirements.forEach(req => { checks[req.id] = false; });
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
    if (!selected || !canReview) return;

    if (status === "approved") {
      const country = selected.profile?.country || "ZM";
      const requirements = getCountryRequirements(country, "healthcareProfessionals");
      const allRequiredChecked = requirements
        .filter(r => r.required)
        .every(r => documentChecks[r.id] === true);
      if (!allRequiredChecked) {
        toast.error("Please verify all required documents before approving.");
        return;
      }
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
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

  const statusPill = (st: string) => {
    if (st === "approved") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-[#00c875]">Approved</span>;
    if (st === "rejected") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-[#e2445c]">Rejected</span>;
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-[#fdab3d]">Pending</span>;
  };

  const p = selected?.profile;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between border-b border-[#e6e9ef] pb-3">
        <h2 className="text-base font-extrabold flex items-center gap-2 mr-auto">
          <ShieldCheck className="h-5 w-5 text-[#0073ea]" />
          Practitioner Accreditation Applications
        </h2>
        <div className="flex items-center gap-1.5">
          {(["pending", "approved", "rejected"] as const).map(f => (
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
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#0073ea]" /></div>
      ) : apps.length === 0 ? (
        <div className="p-8 text-center text-xs text-[#676879] bg-[#f5f6f8] rounded-xl border border-[#e6e9ef]">
          No {filter} provider accreditation applications found.
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-[#e6e9ef] bg-white dark:bg-slate-900">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
                <th className="py-2.5 px-4">Applicant</th>
                <th className="py-2.5 px-3">Specialty</th>
                <th className="py-2.5 px-3">Medical School</th>
                <th className="py-2.5 px-3">License #</th>
                <th className="py-2.5 px-3">Exp.</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e9ef]">
              {apps.map(app => (
                <tr key={app.id} className="hover:bg-[#f0f2f7] transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      {app.profile?.first_name} {app.profile?.last_name}
                    </div>
                    <div className="text-[10px] text-slate-400">{app.profile?.email}</div>
                  </td>
                  <td className="py-3 px-3 font-semibold text-[#0073ea]">{app.specialty || "General Medicine"}</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{app.profile?.medical_school || "—"}</td>
                  <td className="py-3 px-3 font-mono">{app.license_number || "—"}</td>
                  <td className="py-3 px-3 font-bold">{app.years_of_experience} yrs</td>
                  <td className="py-3 px-3 text-center">{statusPill(app.status)}</td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => openReview(app)}
                      className="px-3 py-1 rounded-md bg-[#0073ea] text-white text-[11px] font-bold hover:bg-[#0060c4] flex items-center gap-1 mx-auto"
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
              Review — {p?.first_name} {p?.last_name}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5 text-xs">

              {/* Basic info */}
              <section className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl bg-[#f5f6f8] border border-[#e6e9ef]">
                <InfoRow label="Email" value={p?.email} />
                <InfoRow label="Phone" value={p?.phone} />
                <InfoRow label="License #" value={selected.license_number} />
                <InfoRow label="Specialty" value={selected.specialty} />
                <InfoRow label="Experience" value={selected.years_of_experience ? `${selected.years_of_experience} years` : null} />
                <InfoRow label="Country" value={p?.country} />
              </section>

              {/* Education & credentials */}
              <section>
                <h4 className="font-extrabold uppercase text-[#676879] flex items-center gap-1.5 mb-2">
                  <GraduationCap className="h-4 w-4" /> Education & Credentials
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl bg-[#f5f6f8] border border-[#e6e9ef]">
                  <InfoRow label="Medical School" value={p?.medical_school} />
                  <InfoRow label="Graduation Year" value={p?.graduation_year} />
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-[10px] font-extrabold uppercase text-[#676879]">Board Certifications</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(p?.board_certifications || []).length > 0
                        ? (p!.board_certifications as string[]).map(c => (
                            <Badge key={c} variant="outline" className="text-xs gap-1">
                              <Award className="h-3 w-3 text-[#0073ea]" /> {c}
                            </Badge>
                          ))
                        : <span className="text-[#676879]">None listed</span>
                      }
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-[10px] font-extrabold uppercase text-[#676879]">Subspecialties</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(p?.subspecialties || []).length > 0
                        ? (p!.subspecialties as string[]).map(s => (
                            <Badge key={s} variant="secondary" className="text-xs">
                              <Stethoscope className="h-3 w-3 mr-1" /> {s}
                            </Badge>
                          ))
                        : <span className="text-[#676879]">None listed</span>
                      }
                    </div>
                  </div>
                </div>
              </section>

              {/* Practice details */}
              <section>
                <h4 className="font-extrabold uppercase text-[#676879] flex items-center gap-1.5 mb-2">
                  <Building2 className="h-4 w-4" /> Practice Details
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl bg-[#f5f6f8] border border-[#e6e9ef]">
                  <InfoRow label="Practice Location" value={p?.primary_practice_location} />
                  <InfoRow label="Typical Wait Time" value={p?.typical_wait_time} />
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-[10px] font-extrabold uppercase text-[#676879]">Affiliated Hospitals</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(p?.affiliated_hospitals || []).length > 0
                        ? (p!.affiliated_hospitals as string[]).map(h => (
                            <Badge key={h} variant="outline" className="text-xs">{h}</Badge>
                          ))
                        : <span className="text-[#676879]">None listed</span>
                      }
                    </div>
                  </div>
                </div>
              </section>

              {/* Fees & capabilities */}
              <section>
                <h4 className="font-extrabold uppercase text-[#676879] flex items-center gap-1.5 mb-2">
                  <DollarSign className="h-4 w-4" /> Fees & Capabilities
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl bg-[#f5f6f8] border border-[#e6e9ef]">
                  <InfoRow
                    label="Consultation Fee"
                    value={
                      p?.consultation_fee_min && p?.consultation_fee_max
                        ? `K${p.consultation_fee_min} – K${p.consultation_fee_max}`
                        : p?.consultation_fee_min
                        ? `From K${p.consultation_fee_min}`
                        : null
                    }
                  />
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#676879]">Accepts Insurance</span>
                    <div className="mt-1"><BoolBadge value={p?.accepts_insurance ?? false} /></div>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#676879]">Telemedicine</span>
                    <div className="mt-1"><BoolBadge value={p?.telemedicine_available ?? false} trueLabel="Available" falseLabel="Not offered" /></div>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#676879]">Home Visits</span>
                    <div className="mt-1"><BoolBadge value={p?.home_visits_available ?? false} trueLabel="Available" falseLabel="Not offered" /></div>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-[10px] font-extrabold uppercase text-[#676879]">Insurance Providers Accepted</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(p?.insurance_providers_accepted || []).length > 0
                        ? (p!.insurance_providers_accepted as string[]).map(ins => (
                            <Badge key={ins} variant="outline" className="text-xs">{ins}</Badge>
                          ))
                        : <span className="text-[#676879]">None listed</span>
                      }
                    </div>
                  </div>
                </div>
              </section>

              {/* Languages */}
              {(p?.languages_spoken || []).length > 0 && (
                <section>
                  <h4 className="font-extrabold uppercase text-[#676879] flex items-center gap-1.5 mb-2">
                    <Languages className="h-4 w-4" /> Languages Spoken
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(p!.languages_spoken as string[]).map(lang => (
                      <Badge key={lang} variant="secondary" className="text-xs">{lang}</Badge>
                    ))}
                  </div>
                </section>
              )}

              {/* Document checklist */}
              <section>
                <h4 className="font-extrabold uppercase text-[#676879] mb-2">Document Verification Checklist</h4>
                <div className="space-y-2">
                  {getCountryRequirements(p?.country || "ZM", "healthcareProfessionals").map(req => (
                    <div key={req.id} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[#e6e9ef] bg-[#f5f6f8]">
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
                  ))}
                </div>
              </section>

              {/* Uploaded documents */}
              {Object.keys(docUrls).length > 0 && (
                <section>
                  <h4 className="font-extrabold uppercase text-[#676879] mb-2">
                    Uploaded Documents ({Object.keys(docUrls).length})
                  </h4>
                  <ul className="space-y-1">
                    {Object.entries(docUrls).map(([path, url]) => (
                      <li key={path} className="flex items-center justify-between p-2 border border-[#e6e9ef] rounded-md">
                        <span className="truncate flex-1 font-medium text-xs">{path.split("/").pop()}</span>
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          className="text-[#0073ea] font-bold flex items-center gap-1 ml-2 text-xs shrink-0">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Review notes */}
              <section>
                <label className="font-extrabold uppercase text-[#676879]">Review Notes</label>
                <textarea
                  rows={2}
                  className="w-full mt-1 p-2.5 rounded-md border border-[#c3c6d4] bg-[#f5f6f8] text-xs font-medium"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes (required for rejection)…"
                />
              </section>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <button onClick={() => setSelected(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500">
              Cancel
            </button>
            <button
              onClick={() => decide("rejected")}
              disabled={processing || !notes.trim()}
              className="px-4 py-1.5 rounded-md bg-[#e2445c] text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </button>
            <button
              onClick={() => decide("approved")}
              disabled={processing}
              className="px-4 py-1.5 rounded-md bg-[#00c875] text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1"
            >
              {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve & Verify
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderApplications;
