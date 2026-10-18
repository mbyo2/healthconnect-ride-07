import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Plus, Loader2, Send, Eye, BarChart3, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const getStatusPill = (status: string) => {
  const styles: Record<string, string> = {
    draft: "bg-slate-500",
    scheduled: "bg-amber-500",
    sending: "bg-blue-600",
    sent: "bg-green-600",
    cancelled: "bg-slate-400",
  };
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${styles[status] || "bg-slate-500"}`}>{status}</span>;
};

interface Audience {
  min_age: string;
  max_age: string;
  gender: string;
  last_visit_before: string;
}

export const EmailCampaigns = ({ hospital }: { hospital: any }) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  const [form, setForm] = useState({ name: "", subject: "", body_html: "", scheduled_at: "" });
  const [audience, setAudience] = useState<Audience>({ min_age: "", max_age: "", gender: "", last_visit_before: "" });

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from("email_campaigns" as any) as any)
        .select("*")
        .eq("institution_id", hospital?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCampaigns(data || []);
    } catch {
      toast.error("Could not load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (hospital?.id) loadCampaigns(); }, [hospital?.id]);

  const buildAudienceQuery = () => {
    let q = (supabase.from("profiles" as any) as any)
      .select("id, email, date_of_birth, gender, email_marketing_opt_out")
      .eq("email_marketing_opt_out", false)
      .not("email", "is", null);
    if (audience.gender) q = q.eq("gender", audience.gender);
    return q;
  };

  const estimateAudience = async () => {
    setCounting(true);
    try {
      const { data, error } = await buildAudienceQuery().limit(5000);
      if (error) throw error;
      let filtered = data || [];
      // Age filter client-side (date_of_birth)
      if (audience.min_age || audience.max_age) {
        const now = new Date();
        filtered = filtered.filter((p: any) => {
          if (!p.date_of_birth) return false;
          const age = Math.floor((now.getTime() - new Date(p.date_of_birth).getTime()) / 31557600000);
          if (audience.min_age && age < Number(audience.min_age)) return false;
          if (audience.max_age && age > Number(audience.max_age)) return false;
          return true;
        });
      }
      // Last-visit filter: patients with an appointment before the date
      if (audience.last_visit_before) {
        const { data: appts } = await (supabase.from("appointments" as any) as any)
          .select("patient_id")
          .lt("appointment_date", audience.last_visit_before)
          .limit(5000);
        const visited = new Set((appts || []).map((a: any) => a.patient_id));
        filtered = filtered.filter((p: any) => visited.has(p.id));
      }
      setAudienceCount(filtered.length);
    } catch {
      toast.error("Could not estimate audience");
    } finally {
      setCounting(false);
    }
  };

  const handleSave = async (asDraft: boolean) => {
    if (!form.name.trim() || !form.subject.trim() || !form.body_html.trim()) {
      toast.error("Name, subject, and message body are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from("email_campaigns" as any) as any).insert({
        institution_id: hospital.id,
        name: form.name.trim(),
        subject: form.subject.trim(),
        body_html: form.body_html,
        status: asDraft ? "draft" : "scheduled",
        target_audience: {
          min_age: audience.min_age || null,
          max_age: audience.max_age || null,
          gender: audience.gender || null,
          last_visit_before: audience.last_visit_before || null,
        },
        scheduled_at: !asDraft && form.scheduled_at ? form.scheduled_at : null,
        created_by: user.user?.id,
      }).select().single();
      if (error) throw error;
      toast.success(asDraft ? "Campaign saved as draft" : "Campaign scheduled");
      setShowCompose(false);
      setForm({ name: "", subject: "", body_html: "", scheduled_at: "" });
      setAudience({ min_age: "", max_age: "", gender: "", last_visit_before: "" });
      setAudienceCount(null);
      loadCampaigns();
    } catch (e: any) {
      toast.error(e.message || "Failed to save campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSend = async (campaign: any) => {
    if (!window.confirm(`Send "${campaign.name}" now? This will email all matching patients who have not opted out.`)) return;
    setIsSubmitting(true);
    try {
      // Resolve audience server-side via edge function for reliability
      const { data: session } = await supabase.auth.getSession();
      const resp = await supabase.functions.invoke("send-email-campaign", {
        body: { campaign_id: campaign.id },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      if (resp.error) throw resp.error;
      toast.success(`Campaign sending — ${resp.data?.queued || 0} recipients queued`);
      loadCampaigns();
    } catch (e: any) {
      toast.error(e.message || "Failed to send campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadRecipients = async (campaign: any) => {
    setSelected(campaign);
    try {
      const { data } = await (supabase.from("email_campaign_recipients" as any) as any)
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("created_at", { ascending: false })
        .limit(200);
      setRecipients(data || []);
    } catch { /* non-fatal */ }
  };

  if (selected) {
    const sent = recipients.filter((r) => r.status === "sent").length;
    const failed = recipients.filter((r) => r.status === "failed").length;
    const skipped = recipients.filter((r) => r.status === "skipped_opt_out").length;
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="min-h-[44px]">← All campaigns</Button>
        <div className="rounded-2xl bg-card p-5 dark:bg-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight">{selected.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">Subject: {selected.subject}</p>
            </div>
            {getStatusPill(selected.status)}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Sent</p><p className="text-2xl font-bold mt-1">{sent}</p></div>
            <div className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-bold mt-1">{failed}</p></div>
            <div className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Opted out</p><p className="text-2xl font-bold mt-1">{skipped}</p></div>
          </div>
          {selected.status === "draft" && (
            <Button onClick={() => handleSend(selected)} disabled={isSubmitting} className="mt-4 min-h-[44px]">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Send now
            </Button>
          )}
        </div>
        <div className="rounded-2xl bg-card p-5 dark:bg-card">
          <h3 className="text-lg font-semibold mb-4">Recipients</h3>
          {recipients.length === 0 ? (
            <EmptyState icon={Users} title="No recipients yet" description="Recipients are recorded when the campaign is sent." />
          ) : (
            <ul className="divide-y divide-border">
              {recipients.map((r) => (
                <li key={r.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{r.email}</span>
                  {getStatusPill(r.status === "skipped_opt_out" ? "cancelled" : r.status)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Mail className="w-6 h-6" /> Email campaigns</h2>
          <p className="text-sm text-muted-foreground mt-1">Recalls, screening reminders, and health tips — patients who opted out are never contacted.</p>
        </div>
        <Button onClick={() => setShowCompose(true)} className="min-h-[44px]">
          <Plus className="w-4 h-4 mr-1" /> New campaign
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <EmptyState icon={Mail} title="No campaigns yet" description="Create your first email campaign to reach patients with recalls and health reminders." actionLabel="New campaign" onAction={() => setShowCompose(true)} />
      ) : (
        <ul className="space-y-3">
          {campaigns.map((c) => (
            <li key={c.id}>
              <button onClick={() => loadRecipients(c)} className="w-full text-left rounded-2xl bg-card p-5 dark:bg-card hover:bg-muted/50 transition-colors min-h-[44px]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[17px]">{c.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5" /> {c.sent_count} sent · {c.failed_count} failed
                    </p>
                  </div>
                  {getStatusPill(c.status)}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New email campaign</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div><Label>Campaign name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cervical screening recall — March" className="min-h-[44px] text-base" /></div>
            <div><Label>Email subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Time for your screening appointment" className="min-h-[44px] text-base" /></div>
            <div><Label>Message</Label><Textarea value={form.body_html} onChange={(e) => setForm({ ...form, body_html: e.target.value })} rows={6} className="text-base" placeholder="Write your message. Plain text is fine — it will be formatted as a clean email." /></div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-4">
              <h4 className="font-semibold text-[15px]">Audience</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Min age</Label><Input type="number" value={audience.min_age} onChange={(e) => setAudience({ ...audience, min_age: e.target.value })} placeholder="Any" className="min-h-[44px] text-base" /></div>
                <div><Label>Max age</Label><Input type="number" value={audience.max_age} onChange={(e) => setAudience({ ...audience, max_age: e.target.value })} placeholder="Any" className="min-h-[44px] text-base" /></div>
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={audience.gender} onValueChange={(v) => setAudience({ ...audience, gender: v === "any" ? "" : v })}>
                  <SelectTrigger className="min-h-[44px] text-base"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Last visit before</Label><Input type="date" value={audience.last_visit_before} onChange={(e) => setAudience({ ...audience, last_visit_before: e.target.value })} className="min-h-[44px] text-base" /></div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={estimateAudience} disabled={counting} className="min-h-[44px]">
                  {counting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />} Estimate audience
                </Button>
                {audienceCount !== null && <p className="text-sm text-muted-foreground">~{audienceCount} patients (opt-outs excluded)</p>}
              </div>
            </div>

            <div><Label>Schedule for (optional — leave blank to send manually)</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="min-h-[44px] text-base" /></div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowPreview(true)} className="min-h-[44px]"><Eye className="w-4 h-4 mr-2" /> Preview</Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCompose(false)} className="min-h-[44px]">Cancel</Button>
            <Button type="button" variant="secondary" onClick={() => handleSave(true)} disabled={isSubmitting} className="min-h-[44px]">{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save draft</Button>
            <Button type="button" onClick={() => handleSave(false)} disabled={isSubmitting} className="min-h-[44px]">{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Email preview</DialogTitle></DialogHeader>
          <div className="rounded-xl border border-border p-5 space-y-3">
            <p className="text-xs text-muted-foreground">Subject</p>
            <p className="font-semibold text-[17px]">{form.subject || "(no subject)"}</p>
            <hr className="border-border" />
            <div className="text-[15px] whitespace-pre-wrap">{form.body_html || "(empty message)"}</div>
            <hr className="border-border" />
            <p className="text-xs text-muted-foreground">You're receiving this because you're a patient of this facility. <span className="underline">Unsubscribe</span></p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPreview(false)} className="min-h-[44px]">Close preview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
