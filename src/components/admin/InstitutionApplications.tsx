import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Loader2, FileText, ExternalLink } from "lucide-react";

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
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selected, setSelected] = useState<InstitutionApplication | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [docUrls, setDocUrls] = useState<Array<{ name: string; url: string }>>([]);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('institution_applications' as any)
        .select('*')
        .eq('status', filter)
        .order('submitted_at', { ascending: false });
      if (error) throw error;

      const ids = (data as any[] || []).map(a => a.applicant_id);
      const [{ data: profiles }, { data: institutions }] = await Promise.all([
        ids.length
          ? supabase.from('profiles').select('id, first_name, last_name, email').in('id', ids)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from('healthcare_institutions').select('id, admin_id, license_number, address, city, country, phone, email, is_verified').in('admin_id', ids)
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

  const openReview = async (app: InstitutionApplication) => {
    setSelected(app);
    setNotes(app.reviewer_notes || "");
    setDocUrls([]);
    // List documents in storage under applicant_id folder
    const { data: files } = await supabase.storage
      .from('registration_documents')
      .list(app.applicant_id, { limit: 50 });
    if (files?.length) {
      const out: Array<{ name: string; url: string }> = [];
      for (const f of files) {
        const { data } = await supabase.storage
          .from('registration_documents')
          .createSignedUrl(`${app.applicant_id}/${f.name}`, 3600);
        if (data?.signedUrl) out.push({ name: f.name, url: data.signedUrl });
      }
      setDocUrls(out);
    }
  };

  const decide = async (status: 'approved' | 'rejected') => {
    if (!selected) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: appErr } = await supabase
        .from('institution_applications' as any)
        .update({
          status,
          reviewer_notes: notes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selected.id);
      if (appErr) throw appErr;

      if (status === 'approved') {
        await supabase
          .from('healthcare_institutions')
          .update({ is_verified: true })
          .eq('admin_id', selected.applicant_id);
        await supabase.from('profiles').update({ is_verified: true }).eq('id', selected.applicant_id);
      }

      await supabase.from('audit_logs' as any).insert({
        user_id: user?.id,
        action: status === 'approved' ? 'approve_institution' : 'reject_institution',
        resource: 'institution_application',
        resource_id: selected.id,
        details: { institution_name: selected.institution_name, notes },
        category: 'admin_action',
        outcome: 'success',
        severity: 'info',
      });

      await supabase.from('notifications' as any).insert({
        user_id: selected.applicant_id,
        title: status === 'approved' ? 'Institution Approved' : 'Institution Rejected',
        message: status === 'approved'
          ? `Your application for ${selected.institution_name} has been approved.`
          : `Your application for ${selected.institution_name} was rejected. ${notes || ''}`,
        type: 'system',
        read: false,
      });

      toast.success(`Application ${status}`);
      setSelected(null);
      fetchApps();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold mr-auto">Institution Applications</h2>
        {(['pending', 'approved', 'rejected'] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>{f}</Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div>
      ) : apps.length === 0 ? (
        <p className="text-muted-foreground">No {filter} applications.</p>
      ) : (
        <div className="grid gap-3">
          {apps.map(app => (
            <Card key={app.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  {app.institution_name}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">{app.applicant?.email}</span>
                </CardTitle>
                <Badge variant="outline" className="capitalize">{app.institution_type}</Badge>
              </CardHeader>
              <CardContent className="flex justify-between items-center text-sm">
                <div className="space-y-1">
                  <div><span className="text-muted-foreground">License:</span> {app.institution?.license_number || '—'}</div>
                  <div><span className="text-muted-foreground">Location:</span> {app.institution?.city || '—'}, {app.institution?.country || '—'}</div>
                  <div><span className="text-muted-foreground">Submitted:</span> {new Date(app.submitted_at).toLocaleDateString()}</div>
                </div>
                <Button size="sm" onClick={() => openReview(app)}>
                  <FileText className="h-4 w-4 mr-1" /> Review
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Institution Application</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><strong>Institution:</strong> {selected.institution_name}</div>
                <div><strong>Type:</strong> {selected.institution_type}</div>
                <div><strong>Applicant:</strong> {selected.applicant?.first_name} {selected.applicant?.last_name}</div>
                <div><strong>Email:</strong> {selected.applicant?.email}</div>
                <div><strong>License #:</strong> {selected.institution?.license_number || '—'}</div>
                <div><strong>Phone:</strong> {selected.institution?.phone || '—'}</div>
                <div className="col-span-2"><strong>Address:</strong> {selected.institution?.address || '—'}, {selected.institution?.city || ''} {selected.institution?.country || ''}</div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-sm">Uploaded Documents</h4>
                {docUrls.length ? (
                  <ul className="space-y-1">
                    {docUrls.map(d => (
                      <li key={d.name} className="flex items-center justify-between text-sm border rounded p-2">
                        <span className="truncate flex-1">{d.name}</span>
                        <a href={d.url} target="_blank" rel="noopener" className="text-primary hover:underline flex items-center gap-1">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold">Review Notes</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Reason / notes (required for rejection)" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={processing}>Cancel</Button>
            <Button variant="destructive" onClick={() => decide('rejected')} disabled={processing || !notes.trim()}>
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button onClick={() => decide('approved')} disabled={processing || docUrls.length === 0}>
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
