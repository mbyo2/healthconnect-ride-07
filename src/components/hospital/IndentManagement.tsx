import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ClipboardList, Hourglass, Siren, PackageCheck, History, Plus, Loader2, RefreshCw, CheckCircle2, XCircle, Truck } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHospitalModule } from "@/hooks/useHospitalModule";
import { DepartmentSelect } from "@/components/hospital/DepartmentSelect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const getStatusPill = (status: string) => {
  if (status === "approved") return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-primary-400">Approved</span>;
  if (status === "fulfilled") return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-success-500">Fulfilled</span>;
  if (status === "partially_fulfilled") return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-warning-500">Partially fulfilled</span>;
  if (status === "rejected") return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-error-500">Rejected</span>;
  if (status === "cancelled") return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-error-500">Cancelled</span>;
  return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-warning-500">Pending</span>;
};

const getPriorityPill = (priority: string) => {
  if (priority === "emergency") return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-error-500">Emergency</span>;
  if (priority === "urgent") return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-warning-500">Urgent</span>;
  return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-primary-400">Routine</span>;
};

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
};

interface ItemRow { item_name: string; quantity_requested: string; unit: string; notes: string; }

const blankItem = (): ItemRow => ({ item_name: "", quantity_requested: "1", unit: "units", notes: "" });

export const IndentManagement = ({ hospital, departments }: { hospital: any; departments?: any[] }) => {
  const [activeTab, setActiveTab] = useState<"raise" | "queue" | "history">("queue");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showFulfill, setShowFulfill] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const [department, setDepartment] = useState("");
  const [priority, setPriority] = useState("routine");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([blankItem()]);
  const [rejectReason, setRejectReason] = useState("");
  const [approveQtys, setApproveQtys] = useState<Record<string, string>>({});
  const [issueQtys, setIssueQtys] = useState<Record<string, string>>({});

  const { data: indents, loading, error, refresh } = useHospitalModule<any>("indents", "institution_id", hospital?.id, { orderBy: "created_at", ascending: false });
  const { data: allItems, loading: itemsLoading, refresh: refreshItems } = useHospitalModule<any>("indent_items", null, null, { orderBy: "created_at", ascending: true, limit: 1000 });

  const myIndentIds = new Set(indents.map((i) => i.id));
  const itemsFor = (indentId: string) => allItems.filter((it) => it.indent_id === indentId);

  const pending = indents.filter((i) => i.status === "pending");
  const urgentQueue = indents.filter((i) => (i.status === "pending" || i.status === "approved") && (i.priority === "urgent" || i.priority === "emergency"));
  const partial = indents.filter((i) => i.status === "partially_fulfilled");
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const fulfilledMonth = indents.filter((i) => i.status === "fulfilled" && new Date(i.updated_at) >= monthStart);

  const refreshAll = () => { refresh(); refreshItems(); };

  // ---- Raise indent ----
  const addItemRow = () => setItems([...items, blankItem()]);
  const removeItemRow = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); };
  const setItem = (idx: number, patch: Partial<ItemRow>) => setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const handleRaise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department) { toast.error("Select a department"); return; }
    const valid = items.filter((it) => it.item_name.trim() && Number(it.quantity_requested) > 0);
    if (valid.length === 0) { toast.error("Add at least one item with a quantity"); return; }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const indentNumber = `IND-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { data: created, error: err } = await (supabase.from("indents" as any) as any).insert({
        indent_number: indentNumber,
        institution_id: hospital.id,
        department,
        requested_by: user?.id || null,
        priority,
        notes: notes.trim() || null,
      }).select("id").single();
      if (err) throw err;
      const rows = valid.map((it) => ({
        indent_id: created.id,
        item_name: it.item_name.trim(),
        quantity_requested: Number(it.quantity_requested),
        unit: it.unit.trim() || "units",
        notes: it.notes.trim() || null,
      }));
      const { error: itemErr } = await (supabase.from("indent_items" as any) as any).insert(rows);
      if (itemErr) throw itemErr;
      toast.success(`Indent ${indentNumber} raised`);
      setDepartment(""); setPriority("routine"); setNotes(""); setItems([blankItem()]);
      setActiveTab("queue");
      refreshAll();
    } catch (e: any) { toast.error(e?.message || "Failed to raise indent"); }
    finally { setIsSubmitting(false); }
  };

  // ---- Approve ----
  const openApprove = (indent: any) => {
    setSelected(indent);
    const map: Record<string, string> = {};
    itemsFor(indent.id).forEach((it) => { map[it.id] = String(it.quantity_requested); });
    setApproveQtys(map);
    setShowApprove(true);
  };

  const handleApprove = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const its = itemsFor(selected.id);
      for (const it of its) {
        const q = Math.max(0, Number(approveQtys[it.id] ?? it.quantity_requested));
        const { error: err } = await (supabase.from("indent_items" as any) as any).update({ quantity_approved: q }).eq("id", it.id);
        if (err) throw err;
      }
      const { error: err } = await (supabase.from("indents" as any) as any).update({
        status: "approved", decided_by: user?.id || null, decided_at: new Date().toISOString(),
      }).eq("id", selected.id);
      if (err) throw err;
      toast.success(`Indent ${selected.indent_number} approved`);
      setShowApprove(false); setSelected(null);
      refreshAll();
    } catch (e: any) { toast.error(e?.message || "Failed to approve"); }
    finally { setIsSubmitting(false); }
  };

  // ---- Reject ----
  const openReject = (indent: any) => { setSelected(indent); setRejectReason(""); setShowReject(true); };

  const handleReject = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) { toast.error("Give a reason so the department knows what to fix"); return; }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: err } = await (supabase.from("indents" as any) as any).update({
        status: "rejected", rejection_reason: rejectReason.trim(),
        decided_by: user?.id || null, decided_at: new Date().toISOString(),
      }).eq("id", selected.id);
      if (err) throw err;
      toast.success(`Indent ${selected.indent_number} rejected`);
      setShowReject(false); setSelected(null);
      refreshAll();
    } catch (e: any) { toast.error(e?.message || "Failed to reject"); }
    finally { setIsSubmitting(false); }
  };

  // ---- Fulfill ----
  const openFulfill = (indent: any) => {
    setSelected(indent);
    const map: Record<string, string> = {};
    itemsFor(indent.id).forEach((it) => {
      const remaining = Math.max(0, (it.quantity_approved || 0) - (it.quantity_issued || 0));
      map[it.id] = String(remaining);
    });
    setIssueQtys(map);
    setShowFulfill(true);
  };

  const handleFulfill = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      const its = itemsFor(selected.id);
      let anyIssued = false;
      let allComplete = true;
      for (const it of its) {
        const issueNow = Math.max(0, Number(issueQtys[it.id] ?? 0));
        const newIssued = (it.quantity_issued || 0) + issueNow;
        if (newIssued > (it.quantity_approved || 0)) {
          toast.error(`Cannot issue more than approved for ${it.item_name}`);
          setIsSubmitting(false);
          return;
        }
        if (issueNow > 0) anyIssued = true;
        if (newIssued < (it.quantity_approved || 0)) allComplete = false;
        const { error: err } = await (supabase.from("indent_items" as any) as any).update({ quantity_issued: newIssued }).eq("id", it.id);
        if (err) throw err;
      }
      if (!anyIssued) { toast.error("Enter a quantity to issue for at least one item"); setIsSubmitting(false); return; }
      const { error: err } = await (supabase.from("indents" as any) as any).update({
        status: allComplete ? "fulfilled" : "partially_fulfilled",
      }).eq("id", selected.id);
      if (err) throw err;
      toast.success(allComplete ? "Indent fulfilled" : "Partial issue recorded");
      setShowFulfill(false); setSelected(null);
      refreshAll();
    } catch (e: any) { toast.error(e?.message || "Failed to record issue"); }
    finally { setIsSubmitting(false); }
  };

  // ---- Cancel (requester) ----
  const handleCancel = async () => {
    if (!selected) return;
    try {
      const { error: err } = await (supabase.from("indents" as any) as any).update({ status: "cancelled" }).eq("id", selected.id);
      if (err) throw err;
      toast.success("Indent cancelled");
      setShowCancelConfirm(false); setSelected(null);
      refreshAll();
    } catch (e: any) { toast.error(e?.message || "Failed to cancel"); }
  };

  const glance = [
    { label: "Pending approval", value: pending.length, icon: Hourglass, tone: pending.length > 0 ? "text-warning-500" : "text-primary-500" },
    { label: "Urgent / emergency", value: urgentQueue.length, icon: Siren, tone: urgentQueue.length > 0 ? "text-error-500" : "text-primary-500" },
    { label: "Partially fulfilled", value: partial.length, icon: PackageCheck, tone: "text-primary-500" },
    { label: "Fulfilled this month", value: fulfilledMonth.length, icon: CheckCircle2, tone: "text-success-500" },
  ];

  const renderIndentCard = (indent: any, showActions: boolean) => {
    const its = itemsFor(indent.id);
    return (
      <div key={indent.id} className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="text-[15px] font-extrabold">{indent.indent_number} <span className="font-medium text-graphite-500 dark:text-slate-400">• {indent.department}</span></p>
            <p className="text-xs text-graphite-500 dark:text-slate-400">Raised {fmtDate(indent.created_at)}{indent.notes ? ` • ${indent.notes}` : ""}</p>
          </div>
          <div className="flex gap-1.5 items-center flex-wrap">{getPriorityPill(indent.priority)}{getStatusPill(indent.status)}</div>
        </div>
        <div className="rounded-xl bg-canvas dark:bg-slate-800/60 p-3 space-y-1">
          {its.map((it) => (
            <div key={it.id} className="flex justify-between gap-2 text-xs">
              <span className="font-bold">{it.item_name}</span>
              <span className="text-graphite-500 dark:text-slate-400 tabular-nums">
                req {it.quantity_requested} {it.unit} • appr {it.quantity_approved} • issued {it.quantity_issued}
              </span>
            </div>
          ))}
        </div>
        {indent.status === "rejected" && indent.rejection_reason && (
          <p className="text-xs text-error-500 font-medium">Rejected: {indent.rejection_reason}</p>
        )}
        {showActions && (
          <div className="flex gap-2 flex-wrap pt-1">
            {indent.status === "pending" && (
              <>
                <button onClick={() => openApprove(indent)} className="px-3.5 py-2 min-h-[44px] rounded-md bg-success-500 text-white text-xs font-bold">Approve</button>
                <button onClick={() => openReject(indent)} className="px-3.5 py-2 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-bold text-error-500">Reject</button>
                <button onClick={() => { setSelected(indent); setShowCancelConfirm(true); }} className="px-3 py-2 min-h-[44px] rounded-md text-xs font-bold text-graphite-500 dark:text-slate-400">Cancel</button>
              </>
            )}
            {(indent.status === "approved" || indent.status === "partially_fulfilled") && (
              <button onClick={() => openFulfill(indent)} className="px-3.5 py-2 min-h-[44px] rounded-md bg-primary-500 text-white text-xs font-bold flex items-center gap-1">
                <Truck className="h-3.5 w-3.5" /> Issue stock
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 font-sans text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b border-canvas-silk pb-3">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary-500" />
            Indent Management
          </h3>
          <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">Department supply requests — pharmacy/store approval and fulfillment</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={refreshAll} className="px-3 py-1.5 min-h-[44px] rounded-md bg-canvas-mist dark:bg-slate-800 font-bold text-xs flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={() => setActiveTab("raise")} className="px-3.5 py-1.5 min-h-[44px] rounded-md bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs flex items-center gap-1">
            <Plus className="h-4 w-4" /> Raise indent
          </button>
        </div>
      </div>

      {/* Today at a glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {glance.map((g) => (
          <div key={g.label} className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <g.icon className={`h-5 w-5 ${g.tone} mb-2`} />
            <p className="text-[28px] leading-8 font-extrabold tabular-nums">{g.value}</p>
            <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium mt-1">{g.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-canvas-silk rounded-xl overflow-x-auto">
        {([
          { key: "queue", label: `Approval queue (${pending.length + partial.length})`, icon: Hourglass },
          { key: "raise", label: "Raise indent", icon: Plus },
          { key: "history", label: `History (${indents.length})`, icon: History },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-1.5 min-h-[44px] rounded-md text-xs font-extrabold transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-primary-500 text-white shadow-xs" : "text-graphite-500 dark:text-slate-400 hover:bg-canvas-mist dark:hover:bg-slate-800"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* APPROVAL QUEUE */}
      {activeTab === "queue" && (
        loading || itemsLoading ? <ListSkeleton count={3} variant="row" /> :
        error ? <EmptyState icon={ClipboardList} title="Could not load indents" description={error} actionLabel="Retry" onAction={refresh} /> :
        (pending.length === 0 && partial.length === 0)
          ? <EmptyState icon={Hourglass} title="Queue is clear" description="New supply requests from departments appear here for approval." actionLabel="Raise indent" onAction={() => setActiveTab("raise")} />
          : <div className="space-y-3">{[...pending, ...partial].map((i) => renderIndentCard(i, true))}</div>
      )}

      {/* RAISE INDENT */}
      {activeTab === "raise" && (
        <form onSubmit={handleRaise} className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <DepartmentSelect hospitalId={hospital?.id} value={department} onChange={setDepartment} departments={departments} label="Department *" required valueMode="name" />
            <div>
              <label className="text-xs font-bold">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold">Items *</label>
              <button type="button" onClick={addItemRow} className="px-3 py-1.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Add item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input value={it.item_name} onChange={(e) => setItem(idx, { item_name: e.target.value })} placeholder="Item name" className="col-span-5 px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                  <input type="number" min={1} value={it.quantity_requested} onChange={(e) => setItem(idx, { quantity_requested: e.target.value })} placeholder="Qty" className="col-span-2 px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm tabular-nums" />
                  <input value={it.unit} onChange={(e) => setItem(idx, { unit: e.target.value })} placeholder="Unit" className="col-span-2 px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                  <input value={it.notes} onChange={(e) => setItem(idx, { notes: e.target.value })} placeholder="Note" className="col-span-2 px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                  <button type="button" onClick={() => removeItemRow(idx)} disabled={items.length === 1} className="col-span-1 min-h-[44px] rounded-md text-error-500 text-xs font-bold disabled:opacity-30">✕</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Why is this needed?" className="mt-1 w-full px-3 py-2.5 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
          </div>
          <button type="submit" disabled={isSubmitting} className="px-5 py-3 min-h-[44px] rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-extrabold disabled:opacity-50 flex items-center gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit indent request
          </button>
        </form>
      )}

      {/* HISTORY */}
      {activeTab === "history" && (
        loading || itemsLoading ? <ListSkeleton count={3} variant="row" /> :
        indents.length === 0 ? <EmptyState icon={History} title="No indents yet" description="Raised supply requests and their outcomes appear here." /> :
        <div className="space-y-3">{indents.map((i) => renderIndentCard(i, i.status === "pending" || i.status === "approved" || i.status === "partially_fulfilled"))}</div>
      )}

      {/* Approve dialog */}
      <Dialog open={showApprove} onOpenChange={setShowApprove}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Approve {selected?.indent_number}</DialogTitle></DialogHeader>
          <p className="text-xs text-graphite-500 dark:text-slate-400">Adjust approved quantities if needed — approving less than requested is normal.</p>
          <div className="space-y-2">
            {selected && itemsFor(selected.id).map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-2 rounded-xl bg-canvas dark:bg-slate-800/60 p-3">
                <div>
                  <p className="text-sm font-bold">{it.item_name}</p>
                  <p className="text-xs text-graphite-500 dark:text-slate-400">Requested {it.quantity_requested} {it.unit}</p>
                </div>
                <input type="number" min={0} max={it.quantity_requested} value={approveQtys[it.id] ?? ""} onChange={(e) => setApproveQtys({ ...approveQtys, [it.id]: e.target.value })} className="w-20 px-2 py-2 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm tabular-nums text-center" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <button onClick={() => setShowApprove(false)} className="px-4 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-bold">Cancel</button>
            <button onClick={handleApprove} disabled={isSubmitting} className="px-4 py-2.5 min-h-[44px] rounded-md bg-success-500 text-white text-xs font-extrabold disabled:opacity-50 flex items-center gap-1">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Approve indent
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject {selected?.indent_number}?</DialogTitle></DialogHeader>
          <div>
            <label className="text-xs font-bold">Reason *</label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="e.g. Item not stocked — suggest alternative" className="mt-1 w-full px-3 py-2.5 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
          </div>
          <DialogFooter>
            <button onClick={() => setShowReject(false)} className="px-4 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-bold">Keep</button>
            <button onClick={handleReject} disabled={isSubmitting} className="px-4 py-2.5 min-h-[44px] rounded-md bg-error-500 text-white text-xs font-extrabold disabled:opacity-50 flex items-center gap-1">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} <XCircle className="h-3.5 w-3.5" /> Reject indent
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fulfill dialog */}
      <Dialog open={showFulfill} onOpenChange={setShowFulfill}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Issue stock — {selected?.indent_number}</DialogTitle></DialogHeader>
          <p className="text-xs text-graphite-500 dark:text-slate-400">Enter quantities being issued now. Partial issues are allowed — the indent stays open until fully issued.</p>
          <div className="space-y-2">
            {selected && itemsFor(selected.id).map((it) => {
              const remaining = Math.max(0, (it.quantity_approved || 0) - (it.quantity_issued || 0));
              return (
                <div key={it.id} className="flex items-center justify-between gap-2 rounded-xl bg-canvas dark:bg-slate-800/60 p-3">
                  <div>
                    <p className="text-sm font-bold">{it.item_name}</p>
                    <p className="text-xs text-graphite-500 dark:text-slate-400">Approved {it.quantity_approved} • already issued {it.quantity_issued} • remaining {remaining}</p>
                  </div>
                  <input type="number" min={0} max={remaining} value={issueQtys[it.id] ?? ""} onChange={(e) => setIssueQtys({ ...issueQtys, [it.id]: e.target.value })} className="w-20 px-2 py-2 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm tabular-nums text-center" />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <button onClick={() => setShowFulfill(false)} className="px-4 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-bold">Cancel</button>
            <button onClick={handleFulfill} disabled={isSubmitting} className="px-4 py-2.5 min-h-[44px] rounded-md bg-primary-500 text-white text-xs font-extrabold disabled:opacity-50 flex items-center gap-1">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} <Truck className="h-3.5 w-3.5" /> Record issue
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancel this indent?</DialogTitle></DialogHeader>
          <p className="text-sm text-graphite-500 dark:text-slate-400"><strong className="text-slate-900 dark:text-slate-100">{selected?.indent_number}</strong> will be withdrawn. This cannot be undone.</p>
          <DialogFooter>
            <button onClick={() => setShowCancelConfirm(false)} className="px-4 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-bold">Keep</button>
            <button onClick={handleCancel} className="px-4 py-2.5 min-h-[44px] rounded-md bg-error-500 text-white text-xs font-extrabold">Yes, cancel</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IndentManagement;
