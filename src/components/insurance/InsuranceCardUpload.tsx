import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, CreditCard, CheckCircle2, AlertCircle, Loader2, X, Shield, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface InsuranceCard {
  id: string;
  front_image_url: string;
  back_image_url: string | null;
  verification_status: string;
  ocr_data: Record<string, string>;
  verification_notes?: string | null;
  created_at: string;
}

export const InsuranceCardUpload = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');

  const { data: cards = [] } = useQuery({
    queryKey: ['insurance-cards', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('insurance_cards')
        .select('*')
        .eq('patient_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as InsuranceCard[];
    },
    enabled: !!user,
  });

  const handleFileSelect = (side: 'front' | 'back', file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (side === 'front') {
        setFrontPreview(e.target?.result as string);
        setFrontFile(file);
      } else {
        setBackPreview(e.target?.result as string);
        setBackFile(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadCard = async () => {
    if (!frontFile || !user) {
      toast.error('Please upload the front of your insurance card');
      return;
    }
    setUploading(true);
    try {
      const frontPath = `${user.id}/${Date.now()}-front.${frontFile.name.split('.').pop()}`;
      const { error: frontErr } = await supabase.storage
        .from('insurance_cards')
        .upload(frontPath, frontFile);
      if (frontErr) throw frontErr;

      let backPath: string | null = null;
      if (backFile) {
        backPath = `${user.id}/${Date.now()}-back.${backFile.name.split('.').pop()}`;
        const { error: backErr } = await supabase.storage
          .from('insurance_cards')
          .upload(backPath, backFile);
        if (backErr) throw backErr;
      }

      const { error } = await (supabase as any).from('insurance_cards').insert({
        patient_id: user.id,
        front_image_url: frontPath,
        back_image_url: backPath,
        ocr_data: { provider_name: providerName, policy_number: policyNumber },
        verification_status: 'pending',
      });
      if (error) throw error;

      toast.success('Insurance card uploaded successfully!');
      setFrontPreview(null);
      setBackPreview(null);
      setFrontFile(null);
      setBackFile(null);
      setProviderName('');
      setPolicyNumber('');
      queryClient.invalidateQueries({ queryKey: ['insurance-cards'] });
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'verified': return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending': return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Verifying</Badge>;
      case 'failed': return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Verification Failed</Badge>;
      case 'expired': return <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">Expired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const retryVerification = async (cardId: string) => {
    const { error } = await (supabase as any)
      .from('insurance_cards')
      .update({ verification_status: 'pending', verification_notes: null })
      .eq('id', cardId);
    if (error) {
      toast.error('Failed to retry verification');
      return;
    }
    toast.success('Re-submitting for verification...');
    queryClient.invalidateQueries({ queryKey: ['insurance-cards'] });
  };

  const deleteCard = async (cardId: string) => {
    const { error } = await (supabase as any)
      .from('insurance_cards')
      .delete()
      .eq('id', cardId);
    if (error) {
      toast.error('Failed to delete card');
      return;
    }
    toast.success('Card removed. You can upload a new one.');
    queryClient.invalidateQueries({ queryKey: ['insurance-cards'] });
  };

  const latestCard = cards[0];
  const showFailedBanner = latestCard && latestCard.verification_status === 'failed';
  const showVerifiedBanner = latestCard && latestCard.verification_status === 'verified';

  return (
    <div className="space-y-6">
      {showVerifiedBanner && (
        <Alert className="border-emerald-500/30 bg-emerald-500/5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="text-emerald-700 dark:text-emerald-300">Insurance verified</AlertTitle>
          <AlertDescription>
            Your most recent card was successfully verified. You'll see accurate cost estimates at booking.
          </AlertDescription>
        </Alert>
      )}

      {showFailedBanner && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Verification failed</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{latestCard.verification_notes || 'We couldn\'t verify your insurance. Common causes: blurry photo, glare, expired card, or mismatched policy number.'}</p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => retryVerification(latestCard.id)}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry verification
              </Button>
              <Button size="sm" variant="ghost" onClick={() => deleteCard(latestCard.id)}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete & re-upload
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Upload Insurance Card
          </CardTitle>
          <CardDescription>
            Take a photo or upload your insurance card for faster check-in and cost estimates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Front of Card *</Label>
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect('front', e.target.files[0])}
              />
              {frontPreview ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-primary aspect-[1.6]">
                  <img src={frontPreview} alt="Front" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setFrontPreview(null); setFrontFile(null); }}
                    className="absolute top-2 right-2 p-1 bg-background/80 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => frontInputRef.current?.click()}
                  className="w-full aspect-[1.6] rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tap to capture or upload</span>
                </button>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Back of Card (optional)</Label>
              <input
                ref={backInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect('back', e.target.files[0])}
              />
              {backPreview ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-primary aspect-[1.6]">
                  <img src={backPreview} alt="Back" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setBackPreview(null); setBackFile(null); }}
                    className="absolute top-2 right-2 p-1 bg-background/80 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => backInputRef.current?.click()}
                  className="w-full aspect-[1.6] rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload back (optional)</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ins-provider">Insurance Provider</Label>
              <Input id="ins-provider" placeholder="e.g. Blue Cross" value={providerName} onChange={(e) => setProviderName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ins-policy">Policy Number</Label>
              <Input id="ins-policy" placeholder="e.g. XYZ123456" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} className="mt-1" />
            </div>
          </div>

          <Button onClick={uploadCard} disabled={!frontFile || uploading} className="w-full">
            {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : <><Shield className="h-4 w-4 mr-2" />Upload & Verify</>}
          </Button>
        </CardContent>
      </Card>

      {cards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Insurance Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cards.map((card) => (
                <div key={card.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <CreditCard className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{card.ocr_data?.provider_name || 'Insurance Card'}</p>
                      <p className="text-xs text-muted-foreground">
                        {card.ocr_data?.policy_number || 'No policy number'} • Uploaded {new Date(card.created_at).toLocaleDateString()}
                      </p>
                      {card.verification_status === 'failed' && card.verification_notes && (
                        <p className="text-xs text-destructive mt-1">{card.verification_notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(card.verification_status)}
                    {card.verification_status === 'failed' && (
                      <Button size="sm" variant="ghost" onClick={() => retryVerification(card.id)} className="h-8 px-2">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteCard(card.id)} className="h-8 px-2 text-muted-foreground">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
