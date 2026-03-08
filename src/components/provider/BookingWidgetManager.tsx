import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code2, Copy, Check, Loader2, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface BookingWidget {
  id: string;
  provider_id: string;
  widget_key: string;
  display_name: string | null;
  theme_color: string;
  allowed_domains: string[];
  is_active: boolean;
  total_bookings: number;
}

export const BookingWidgetManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [themeColor, setThemeColor] = useState('#0066FF');
  const [allowedDomain, setAllowedDomain] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: widget } = useQuery({
    queryKey: ['booking-widget', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('booking_widgets')
        .select('*')
        .eq('provider_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as BookingWidget | null;
    },
    enabled: !!user,
  });

  const createWidget = useMutation({
    mutationFn: async () => {
      const domains = allowedDomain ? [allowedDomain] : [];
      const { error } = await (supabase as any).from('booking_widgets').insert({
        provider_id: user!.id,
        display_name: displayName || null,
        theme_color: themeColor,
        allowed_domains: domains,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Booking widget created!');
      queryClient.invalidateQueries({ queryKey: ['booking-widget'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getEmbedCode = (widgetKey: string) => {
    const baseUrl = window.location.origin;
    return `<!-- Healthcare Booking Widget -->
<div id="healthcare-booking-widget"></div>
<script src="${baseUrl}/widget.js" 
  data-widget-key="${widgetKey}"
  data-theme-color="${widget?.theme_color || '#0066FF'}"
  async>
</script>`;
  };

  const getDirectLink = (widgetKey: string) => {
    return `${window.location.origin}/book/${widgetKey}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (widget) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              Your Booking Widget
            </CardTitle>
            <Badge variant={widget.is_active ? 'default' : 'secondary'}>
              {widget.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <CardDescription>Embed this widget on your website to let patients book directly</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="embed">
            <TabsList className="w-full">
              <TabsTrigger value="embed" className="flex-1">Embed Code</TabsTrigger>
              <TabsTrigger value="link" className="flex-1">Direct Link</TabsTrigger>
              <TabsTrigger value="stats" className="flex-1">Stats</TabsTrigger>
            </TabsList>
            <TabsContent value="embed" className="space-y-4 mt-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto font-mono">
                  {getEmbedCode(widget.widget_key)}
                </pre>
                <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => copyToClipboard(getEmbedCode(widget.widget_key))}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Paste this code before the closing &lt;/body&gt; tag on your website.</p>
            </TabsContent>
            <TabsContent value="link" className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Input value={getDirectLink(widget.widget_key)} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(getDirectLink(widget.widget_key))}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Share this link directly with patients.</p>
            </TabsContent>
            <TabsContent value="stats" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-foreground">{widget.total_bookings || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Bookings</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-xl text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: widget.theme_color }} />
                  </div>
                  <p className="text-xs text-muted-foreground">Theme Color</p>
                </div>
              </div>
              {widget.allowed_domains && widget.allowed_domains.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Allowed Domains</p>
                  <div className="flex flex-wrap gap-2">
                    {widget.allowed_domains.map((d: string) => (
                      <Badge key={d} variant="outline" className="text-xs"><Globe className="h-3 w-3 mr-1" />{d}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-primary" />
          Create Booking Widget
        </CardTitle>
        <CardDescription>Add a booking button to your website so patients can schedule directly</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Display Name (optional)</Label>
          <Input placeholder="e.g. Dr. Smith's Clinic" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Theme Color</Label>
          <div className="flex items-center gap-2 mt-1">
            <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
            <Input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="max-w-[120px] font-mono" />
          </div>
        </div>
        <div>
          <Label>Allowed Domain (optional)</Label>
          <Input placeholder="e.g. www.myclinic.com" value={allowedDomain} onChange={(e) => setAllowedDomain(e.target.value)} className="mt-1" />
          <p className="text-xs text-muted-foreground mt-1">Leave empty to allow from any domain</p>
        </div>
        <Button onClick={() => createWidget.mutate()} disabled={createWidget.isPending} className="w-full">
          {createWidget.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Code2 className="h-4 w-4 mr-2" />}
          Create Widget
        </Button>
      </CardContent>
    </Card>
  );
};
