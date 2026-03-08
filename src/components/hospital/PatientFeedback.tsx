import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MessageSquare, Star, ThumbsUp, Clock, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface Props {
  hospital?: any;
  isPatientView?: boolean;
}

const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(s => (
      <Star key={s} className={`h-5 w-5 cursor-pointer transition-colors ${s <= value ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`}
        onClick={() => onChange(s)} />
    ))}
  </div>
);

export const PatientFeedback = ({ hospital, isPatientView }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    rating: 0, cleanliness_rating: 0, staff_rating: 0, wait_time_rating: 0,
    visit_type: 'opd', comments: '', suggestions: '', is_anonymous: false
  });

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['patient-feedback', hospital?.id || user?.id],
    queryFn: async () => {
      const query = supabase.from('patient_feedback' as any).select('*').order('created_at', { ascending: false });
      if (isPatientView) {
        const { data } = await query.eq('patient_id', user?.id);
        return (data as any[]) || [];
      }
      const { data } = await query.eq('hospital_id', hospital?.id);
      return (data as any[]) || [];
    },
    enabled: !!(hospital?.id || user?.id),
  });

  const submit = async () => {
    if (form.rating === 0) { toast.error('Overall rating required'); return; }
    const { error } = await supabase.from('patient_feedback' as any).insert({
      hospital_id: hospital?.id,
      patient_id: user?.id,
      ...form,
    });
    if (error) { toast.error('Failed to submit'); return; }
    toast.success('Feedback submitted. Thank you!');
    setShowForm(false);
    setForm({ rating: 0, cleanliness_rating: 0, staff_rating: 0, wait_time_rating: 0, visit_type: 'opd', comments: '', suggestions: '', is_anonymous: false });
    queryClient.invalidateQueries({ queryKey: ['patient-feedback'] });
  };

  const avgRating = feedbacks.length ? (feedbacks.reduce((s: number, f: any) => s + (f.rating || 0), 0) / feedbacks.length).toFixed(1) : '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Patient Feedback
          </h3>
          <p className="text-sm text-muted-foreground">
            {isPatientView ? 'Share your experience' : 'Monitor patient satisfaction'}
          </p>
        </div>
        {isPatientView && <Button size="sm" onClick={() => setShowForm(true)}><Star className="h-4 w-4 mr-1" /> Give Feedback</Button>}
      </div>

      {!isPatientView && (
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="pt-4 text-center">
            <Star className="h-5 w-5 mx-auto text-amber-400 fill-amber-400 mb-1" />
            <p className="text-2xl font-bold text-foreground">{avgRating}</p>
            <p className="text-xs text-muted-foreground">Avg Rating</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <ThumbsUp className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-2xl font-bold text-foreground">{feedbacks.filter((f: any) => f.rating >= 4).length}</p>
            <p className="text-xs text-muted-foreground">Positive</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{feedbacks.filter((f: any) => f.status === 'pending').length}</p>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent></Card>
        </div>
      )}

      <div className="space-y-3">
        {feedbacks.map((f: any) => (
          <Card key={f.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`h-3 w-3 ${s <= f.rating ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
                      ))}
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase">{f.visit_type}</Badge>
                    <Badge variant={f.status === 'addressed' ? 'default' : 'secondary'} className="text-[10px]">{f.status}</Badge>
                  </div>
                  {f.comments && <p className="text-xs text-foreground mt-2">{f.comments}</p>}
                  {f.suggestions && <p className="text-xs text-muted-foreground mt-1 italic">Suggestion: {f.suggestions}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(f.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {feedbacks.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No feedback yet</p>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Share Your Feedback</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs">Visit Type</Label>
              <Select value={form.visit_type} onValueChange={v => setForm(p => ({ ...p, visit_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="opd">OPD</SelectItem>
                  <SelectItem value="ipd">IPD</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="lab">Lab/Diagnostic</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Overall Rating *</Label><StarRating value={form.rating} onChange={v => setForm(p => ({ ...p, rating: v }))} /></div>
            <div><Label className="text-xs">Cleanliness</Label><StarRating value={form.cleanliness_rating} onChange={v => setForm(p => ({ ...p, cleanliness_rating: v }))} /></div>
            <div><Label className="text-xs">Staff Behavior</Label><StarRating value={form.staff_rating} onChange={v => setForm(p => ({ ...p, staff_rating: v }))} /></div>
            <div><Label className="text-xs">Wait Time</Label><StarRating value={form.wait_time_rating} onChange={v => setForm(p => ({ ...p, wait_time_rating: v }))} /></div>
            <div><Label className="text-xs">Comments</Label><Textarea value={form.comments} onChange={e => setForm(p => ({ ...p, comments: e.target.value }))} rows={2} /></div>
            <div><Label className="text-xs">Suggestions</Label><Textarea value={form.suggestions} onChange={e => setForm(p => ({ ...p, suggestions: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={submit}>Submit Feedback</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
