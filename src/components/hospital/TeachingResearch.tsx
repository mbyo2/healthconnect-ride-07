import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { GraduationCap, FlaskConical, MessagesSquare, Plus, Loader2, RefreshCw } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHospitalModule } from "@/hooks/useHospitalModule";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tab = "rotations" | "research" | "discussions";

const todayISO = () => new Date().toISOString().slice(0, 10);

const rotStatusPill = (s: string) => {
  if (s === "active") return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-success-500">Active</span>;
  if (s === "completed") return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-primary-500">Completed</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-graphite-400">Cancelled</span>;
};

const studyStatusPill = (s: string) => {
  const map: Record<string, string> = {
    proposed: "bg-graphite-400",
    approved: "bg-primary-500",
    ongoing: "bg-warning-500",
    completed: "bg-success-500",
    published: "bg-purple-500",
  };
  const label = s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${map[s] || "bg-graphite-400"}`}>{label}</span>;
};

const studyTypeLabel = (t: string) =>
  t === "clinical_trial" ? "Clinical Trial" : t === "case_study" ? "Case Study" : "Observational";

export const TeachingResearch = ({ hospital }: { hospital: any }) => {
  const [activeTab, setActiveTab] = useState<Tab>("rotations");
  const [showRotation, setShowRotation] = useState(false);
  const [showStudy, setShowStudy] = useState(false);
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const [rotForm, setRotForm] = useState({
    student_name: "", student_id_number: "", university: "", department: "General",
    start_date: todayISO(), end_date: "",
  });
  const [studyForm, setStudyForm] = useState({
    title: "", principal_investigator: "", study_type: "observational",
    start_date: todayISO(), end_date: "", ethics_approval_number: "", description: "",
  });
  const [discForm, setDiscForm] = useState({
    title: "", discussion_date: todayISO(), department: "General",
    case_summary: "", learning_points: "",
  });

  const hid = hospital?.id;
  const { data: rotations, loading: rotLoading, refresh: refreshRot } = useHospitalModule<any>("teaching_rotations", "institution_id", hid, { orderBy: "start_date", ascending: false });
  const { data: studies, loading: studyLoading, refresh: refreshStudy } = useHospitalModule<any>("research_studies", "institution_id", hid, { orderBy: "created_at", ascending: false });
  const { data: discussions, loading: discLoading, refresh: refreshDisc } = useHospitalModule<any>("case_discussions", "institution_id", hid, { orderBy: "discussion_date", ascending: false });

  const activeRotations = rotations.filter((r) => r.status === "active").length;
  const ongoingStudies = studies.filter((s) => s.status === "ongoing" || s.status === "approved").length;

  const set = (setter: any) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setter((f: any) => ({ ...f, [e.target.name]: e.target.value }));

  const handleAddRotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotForm.student_name.trim()) { toast.error("Enter the student's name"); return; }
    setIsSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error: err } = await (supabase.from("teaching_rotations" as any) as any).insert({
        institution_id: hid,
        student_name: rotForm.student_name.trim(),
        student_id_number: rotForm.student_id_number || null,
        university: rotForm.university || null,
        department: rotForm.department,
        start_date: rotForm.start_date,
        end_date: rotForm.end_date || null,
        supervisor_id: user?.user?.id || null,
        status: "active",
      });
      if (err) throw err;
      toast.success("Rotation registered");
      setShowRotation(false);
      setRotForm({ student_name: "", student_id_number: "", university: "", department: "General", start_date: todayISO(), end_date: "" });
      refreshRot();
    } catch (e: any) { toast.error(e?.message || "Failed to register rotation"); }
    finally { setIsSubmitting(false); }
  };

  const handleRotationStatus = async (row: any, status: "completed" | "cancelled") => {
    try {
      const { error: err } = await (supabase.from("teaching_rotations" as any) as any).update({ status }).eq("id", row.id);
      if (err) throw err;
      toast.success(`Rotation marked as ${status}`);
      refreshRot();
    } catch (e: any) { toast.error(e?.message || "Failed to update rotation"); }
  };

  const handleAddStudy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyForm.title.trim()) { toast.error("Enter the study title"); return; }
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("research_studies" as any) as any).insert({
        institution_id: hid,
        title: studyForm.title.trim(),
        principal_investigator: studyForm.principal_investigator || null,
        study_type: studyForm.study_type,
        status: "proposed",
        start_date: studyForm.start_date || null,
        end_date: studyForm.end_date || null,
        ethics_approval_number: studyForm.ethics_approval_number || null,
        description: studyForm.description || null,
      });
      if (err) throw err;
      toast.success("Research study registered");
      setShowStudy(false);
      setStudyForm({ title: "", principal_investigator: "", study_type: "observational", start_date: todayISO(), end_date: "", ethics_approval_number: "", description: "" });
      refreshStudy();
    } catch (e: any) { toast.error(e?.message || "Failed to register study"); }
    finally { setIsSubmitting(false); }
  };

  const STUDY_FLOW: Record<string, string> = {
    proposed: "approved", approved: "ongoing", ongoing: "completed", completed: "published",
  };

  const advanceStudy = async (row: any) => {
    const next = STUDY_FLOW[row.status];
    if (!next) return;
    setAdvancingId(row.id);
    try {
      const { error: err } = await (supabase.from("research_studies" as any) as any).update({ status: next }).eq("id", row.id);
      if (err) throw err;
      toast.success(`Study moved to ${next.replace("_", " ")}`);
      refreshStudy();
    } catch (e: any) { toast.error(e?.message || "Failed to advance study"); }
    finally { setAdvancingId(null); }
  };

  const handleAddDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discForm.title.trim()) { toast.error("Enter a title for the discussion"); return; }
    setIsSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error: err } = await (supabase.from("case_discussions" as any) as any).insert({
        institution_id: hid,
        title: discForm.title.trim(),
        presenter_id: user?.user?.id || null,
        discussion_date: discForm.discussion_date,
        department: discForm.department,
        case_summary: discForm.case_summary || null,
        learning_points: discForm.learning_points || null,
      });
      if (err) throw err;
      toast.success("Case discussion scheduled");
      setShowDiscussion(false);
      setDiscForm({ title: "", discussion_date: todayISO(), department: "General", case_summary: "", learning_points: "" });
      refreshDisc();
    } catch (e: any) { toast.error(e?.message || "Failed to schedule discussion"); }
    finally { setIsSubmitting(false); }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "rotations", label: "Rotations", icon: <GraduationCap className="h-4 w-4" />, badge: activeRotations || undefined },
    { key: "research", label: "Research", icon: <FlaskConical className="h-4 w-4" />, badge: ongoingStudies || undefined },
    { key: "discussions", label: "Case Discussions", icon: <MessagesSquare className="h-4 w-4" /> },
  ];

  const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  const labelCls = "text-xs font-medium text-muted-foreground";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 p-1 rounded-lg bg-muted/60">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === t.key ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.icon}{t.label}
              {t.badge ? <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-500 text-white">{t.badge}</span> : null}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {activeTab === "rotations" && <button onClick={() => setShowRotation(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"><Plus className="h-4 w-4" />Register Rotation</button>}
          {activeTab === "research" && <button onClick={() => setShowStudy(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"><Plus className="h-4 w-4" />New Study</button>}
          {activeTab === "discussions" && <button onClick={() => setShowDiscussion(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"><Plus className="h-4 w-4" />Schedule Discussion</button>}
        </div>
      </div>

      {/* ── Rotations ── */}
      {activeTab === "rotations" && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Student Rotations {activeRotations > 0 && <span className="text-xs font-normal text-muted-foreground">({activeRotations} active)</span>}</h3>
            <button onClick={refreshRot} className="p-1.5 rounded-md hover:bg-muted"><RefreshCw className="h-4 w-4" /></button>
          </div>
          {rotLoading ? <ListSkeleton rows={4} /> : rotations.length === 0 ? (
            <EmptyState title="No rotations yet" description="Register the first student rotation to start the roster." />
          ) : (
            <div className="divide-y divide-border">
              {rotations.map((r: any) => (
                <div key={r.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{r.student_name} {rotStatusPill(r.status)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.department}{r.university ? ` · ${r.university}` : ""}
                      {r.student_id_number ? ` · ID ${r.student_id_number}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.start_date}{r.end_date ? ` → ${r.end_date}` : ""}</p>
                  </div>
                  {r.status === "active" && (
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleRotationStatus(r, "completed")} className="text-[11px] font-medium px-2 py-1 rounded-md border border-border hover:bg-muted">Complete</button>
                      <button onClick={() => handleRotationStatus(r, "cancelled")} className="text-[11px] font-medium px-2 py-1 rounded-md border border-border hover:bg-muted text-error-600">Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Research ── */}
      {activeTab === "research" && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Research Studies</h3>
            <button onClick={refreshStudy} className="p-1.5 rounded-md hover:bg-muted"><RefreshCw className="h-4 w-4" /></button>
          </div>
          {studyLoading ? <ListSkeleton rows={4} /> : studies.length === 0 ? (
            <EmptyState title="No research studies yet" description="Register the first study to start the research registry." />
          ) : (
            <div className="divide-y divide-border">
              {studies.map((s: any) => (
                <div key={s.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{s.title} {studyStatusPill(s.status)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {studyTypeLabel(s.study_type)}
                        {s.principal_investigator ? ` · PI: ${s.principal_investigator}` : ""}
                        {s.ethics_approval_number ? ` · Ethics: ${s.ethics_approval_number}` : ""}
                      </p>
                      {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                    </div>
                    {STUDY_FLOW[s.status] && (
                      <button
                        onClick={() => advanceStudy(s)}
                        disabled={advancingId === s.id}
                        className="shrink-0 text-[11px] font-medium px-2 py-1 rounded-md bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
                      >
                        {advancingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : `→ ${STUDY_FLOW[s.status].replace("_", " ")}`}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Case Discussions ── */}
      {activeTab === "discussions" && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Case Discussions</h3>
            <button onClick={refreshDisc} className="p-1.5 rounded-md hover:bg-muted"><RefreshCw className="h-4 w-4" /></button>
          </div>
          {discLoading ? <ListSkeleton rows={4} /> : discussions.length === 0 ? (
            <EmptyState title="No case discussions yet" description="Schedule the first case discussion for the teaching calendar." />
          ) : (
            <div className="divide-y divide-border">
              {discussions.map((d: any) => (
                <div key={d.id} className="px-4 py-3">
                  <p className="text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.discussion_date} · {d.department}</p>
                  {d.case_summary && <p className="text-xs text-muted-foreground mt-1.5"><span className="font-medium">Case:</span> {d.case_summary}</p>}
                  {d.learning_points && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Learning points:</span> {d.learning_points}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Rotation dialog ── */}
      <Dialog open={showRotation} onOpenChange={setShowRotation}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Register Student Rotation</DialogTitle></DialogHeader>
          <form onSubmit={handleAddRotation} className="space-y-3">
            <div><label className={labelCls}>Student name *</label><input name="student_name" value={rotForm.student_name} onChange={set(setRotForm)} className={inputCls} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Student ID number</label><input name="student_id_number" value={rotForm.student_id_number} onChange={set(setRotForm)} className={inputCls} /></div>
              <div><label className={labelCls}>University</label><input name="university" value={rotForm.university} onChange={set(setRotForm)} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Department</label><input name="department" value={rotForm.department} onChange={set(setRotForm)} className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Start date</label><input type="date" name="start_date" value={rotForm.start_date} onChange={set(setRotForm)} className={inputCls} required /></div>
              <div><label className={labelCls}>End date</label><input type="date" name="end_date" value={rotForm.end_date} onChange={set(setRotForm)} className={inputCls} /></div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowRotation(false)} className="px-3 py-2 rounded-md border border-border text-sm">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-3 py-2 rounded-md bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Study dialog ── */}
      <Dialog open={showStudy} onOpenChange={setShowStudy}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Research Study</DialogTitle></DialogHeader>
          <form onSubmit={handleAddStudy} className="space-y-3">
            <div><label className={labelCls}>Title *</label><input name="title" value={studyForm.title} onChange={set(setStudyForm)} className={inputCls} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Principal investigator</label><input name="principal_investigator" value={studyForm.principal_investigator} onChange={set(setStudyForm)} className={inputCls} /></div>
              <div>
                <label className={labelCls}>Study type</label>
                <select name="study_type" value={studyForm.study_type} onChange={set(setStudyForm)} className={inputCls}>
                  <option value="observational">Observational</option>
                  <option value="clinical_trial">Clinical Trial</option>
                  <option value="case_study">Case Study</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Start date</label><input type="date" name="start_date" value={studyForm.start_date} onChange={set(setStudyForm)} className={inputCls} /></div>
              <div><label className={labelCls}>End date</label><input type="date" name="end_date" value={studyForm.end_date} onChange={set(setStudyForm)} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Ethics approval number</label><input name="ethics_approval_number" value={studyForm.ethics_approval_number} onChange={set(setStudyForm)} className={inputCls} /></div>
            <div><label className={labelCls}>Description</label><textarea name="description" value={studyForm.description} onChange={set(setStudyForm)} rows={3} className={inputCls} /></div>
            <DialogFooter>
              <button type="button" onClick={() => setShowStudy(false)} className="px-3 py-2 rounded-md border border-border text-sm">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-3 py-2 rounded-md bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register Study"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Discussion dialog ── */}
      <Dialog open={showDiscussion} onOpenChange={setShowDiscussion}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Case Discussion</DialogTitle></DialogHeader>
          <form onSubmit={handleAddDiscussion} className="space-y-3">
            <div><label className={labelCls}>Title *</label><input name="title" value={discForm.title} onChange={set(setDiscForm)} className={inputCls} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Discussion date</label><input type="date" name="discussion_date" value={discForm.discussion_date} onChange={set(setDiscForm)} className={inputCls} required /></div>
              <div><label className={labelCls}>Department</label><input name="department" value={discForm.department} onChange={set(setDiscForm)} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Case summary</label><textarea name="case_summary" value={discForm.case_summary} onChange={set(setDiscForm)} rows={3} className={inputCls} /></div>
            <div><label className={labelCls}>Learning points</label><textarea name="learning_points" value={discForm.learning_points} onChange={set(setDiscForm)} rows={3} className={inputCls} /></div>
            <DialogFooter>
              <button type="button" onClick={() => setShowDiscussion(false)} className="px-3 py-2 rounded-md border border-border text-sm">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-3 py-2 rounded-md bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Schedule"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
