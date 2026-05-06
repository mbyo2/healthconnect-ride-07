import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Loader2, FileText, ExternalLink } from "lucide-react";

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
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selected, setSelected] = useState<ProviderApp | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  const fetchApps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('health_personnel_applications')
        .select('*')
        .eq('status', filter)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = (data || []).map((a: any) => a.user_id);
      const { data: profiles } = userIds.length
        ? await supabase.from('profiles').select('id, first_name, last_name, email, phone').in('id', userIds)
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

  const openReview = async (app: ProviderApp) => {
    setSelected(app);
    setNotes(app.review_notes || "");
    setDocUrls({});
    if (app.documents_url?.length) {
      const urls: Record<string, string> = {};
      for (const path of app.documents_url) {
        const { data } = await supabase.storage.from('registration_documents').createSignedUrl(path, 3600);
        if (data?.signedUrl) urls[path] = data.signedUrl;
      }
      setDocUrls(urls);
    }
  };

  const decide = async (status: 'approved' | 'rejected') => {
    if (!selected) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('health_personnel_applications')
        .update({
          status,
          review_notes: notes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selected.id);
      if (error) throw error;

      if (status === 'approved') {
        await supabase.from('profiles').update({ is_verified: true }).eq('id', selected.user_id);
      }

      await supabase.from('notifications' as any).insert({
        user_id: selected.user_id,
        title: status === 'approved' ? 'Application Approved' : 'Application Rejected',
        message: status === 'approved'
          ? 'Your provider application has been approved. You can now access provider features.'
          : `Your application was rejected. ${notes || 'Please contact support for details.'}`,
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
        <h2 className="text-xl font-semibold mr-auto">Provider Applications</h2>
        {(['pending', 'approved', 'rejected'] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {f}
          </Button>
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
                  {app.profile?.first_name} {app.profile?.last_name}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">{app.profile?.email}</span>
                </CardTitle>
                <Badge variant="outline">{app.specialty || 'No specialty'}</Badge>
              </CardHeader>
              <CardContent className="flex justify-between items-center text-sm">
                <div className="space-y-1">
                  <div><span className="text-muted-foreground">License:</span> {app.license_number || '—'}</div>
                  <div><span className="text-muted-foreground">Experience:</span> {app.years_of_experience} years</div>
                  <div><span className="text-muted-foreground">Documents:</span> {app.documents_url?.length || 0} uploaded</div>
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
            <DialogTitle>Review Application</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><strong>Name:</strong> {selected.profile?.first_name} {selected.profile?.last_name}</div>
                <div><strong>Email:</strong> {selected.profile?.email}</div>
                <div><strong>Phone:</strong> {selected.profile?.phone || '—'}</div>
                <div><strong>Specialty:</strong> {selected.specialty}</div>
                <div><strong>License #:</strong> {selected.license_number || '—'}</div>
                <div><strong>Years:</strong> {selected.years_of_experience}</div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-sm">Uploaded Documents</h4>
                {selected.documents_url?.length ? (
                  <ul className="space-y-1">
                    {selected.documents_url.map((path) => (
                      <li key={path} className="flex items-center justify-between text-sm border rounded p-2">
                        <span className="truncate flex-1">{path.split('/').pop()}</span>
                        {docUrls[path] ? (
                          <a href={docUrls[path]} target="_blank" rel="noopener" className="text-primary hover:underline flex items-center gap-1">
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : <Loader2 className="h-3 w-3 animate-spin" />}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold">Review Notes</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason / notes (required for rejection)" rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={processing}>Cancel</Button>
            <Button variant="destructive" onClick={() => decide('rejected')} disabled={processing || !notes.trim()}>
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button onClick={() => decide('approved')} disabled={processing || !selected?.documents_url?.length}>
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderApplications;
