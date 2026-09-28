import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Truck, AlertTriangle, Phone, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/use-currency';

export interface DeliveryZoneOption {
  id: string;
  zone: string;
  fee: number;
  etaMinutes: number | null;
  restrictions: string[];
}

interface DeliveryCalculatorProps {
  pharmacyId: string;
  patientPhone?: string;
  onDeliverySelect: (option: DeliveryZoneOption | null) => void;
}

/**
 * Returns the pickup-only reason when a product category cannot be delivered
 * under Zambian pharmacy rules, otherwise null.
 */
export function deliveryRestrictionReason(category?: string | null): string | null {
  const c = (category || '').toLowerCase();
  if (!c) return null;
  if (c.includes('controlled')) return 'Controlled substances require in-person pickup under Zambian law';
  if (c.includes('injectable')) return 'Injectable medications require pharmacy administration';
  if (c.includes('narcotic')) return 'Narcotic medications require in-person verification';
  if (c.includes('schedule')) return 'Scheduled drugs require in-person pickup';
  return null;
}

export const DeliveryCalculator = ({ pharmacyId, patientPhone, onDeliverySelect }: DeliveryCalculatorProps) => {
  const [zones, setZones] = useState<DeliveryZoneOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const { formatPrice } = useCurrency();

  // Real delivery zones configured by this pharmacy — never invented fees.
  useEffect(() => {
    if (!pharmacyId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('delivery_zones')
          .select('id, zone_name, delivery_fee, max_delivery_time, restrictions')
          .eq('pharmacy_id', pharmacyId)
          .eq('is_active', true)
          .order('delivery_fee', { ascending: true })
          .limit(50);
        if (error) throw error;
        if (!cancelled) {
          setZones(((data as any[]) || []).map((z) => ({
            id: z.id,
            zone: z.zone_name,
            fee: Number(z.delivery_fee || 0),
            etaMinutes: z.max_delivery_time ?? null,
            restrictions: (z.restrictions as string[]) || [],
          })));
        }
      } catch (e) {
        console.error('Delivery zones failed:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pharmacyId]);

  const selectDeliveryOption = (option: DeliveryZoneOption) => {
    setSelectedZone(option.id);
    onDeliverySelect(option);
  };

  const selectPickup = () => {
    setSelectedZone('pickup');
    onDeliverySelect(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Delivery Options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading this pharmacy&apos;s delivery zones…
          </div>
        ) : zones.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-xs font-bold">No delivery zones configured by this pharmacy</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Choose free pharmacy pickup below, or ask the pharmacy about delivery when they confirm your order.
            </p>
          </div>
        ) : (
          <div className="space-y-3" role="radiogroup" aria-label="Delivery zones">
            {zones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                role="radio"
                aria-checked={selectedZone === zone.id}
                onClick={() => selectDeliveryOption(zone)}
                className={`w-full border rounded-lg p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  selectedZone === zone.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{zone.zone}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {zone.etaMinutes !== null && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Up to {zone.etaMinutes} min
                        </span>
                      )}
                      <span className="font-medium text-foreground">
                        {formatPrice(zone.fee)} delivery fee
                      </span>
                    </div>
                  </div>
                  {selectedZone === zone.id && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
                {zone.restrictions.length > 0 && (
                  <div className="mt-2">
                    {zone.restrictions.map((restriction, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs mr-1">
                        {restriction}
                      </Badge>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Pharmacy Pickup Option */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedZone === 'pickup'}
          onClick={selectPickup}
          className={`w-full border rounded-lg p-4 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            selectedZone === 'pickup'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground/30'
          }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Pharmacy Pickup</h3>
              <p className="text-sm text-muted-foreground">Collect from pharmacy - Free</p>
            </div>
            {selectedZone === 'pickup' && (
              <CheckCircle className="h-5 w-5 text-primary" />
            )}
          </div>
        </button>

        {/* Safety Notice */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Delivery Safety Notice</p>
              <p className="text-muted-foreground">
                ID verification required for prescription medications.
                Secure packaging ensures medication integrity.
                {patientPhone ? ' The pharmacy will call you to confirm dispatch.' : ' Track this delivery from your orders page.'}
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Delivery fees are set by the pharmacy and collected on dispatch — they are
          not added to your online order total.
        </p>
      </CardContent>
    </Card>
  );
};


