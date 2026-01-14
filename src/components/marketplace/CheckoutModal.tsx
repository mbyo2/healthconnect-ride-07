
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cart } from '@/types/marketplace';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { DeliveryCalculator } from './DeliveryCalculator';
import { toast } from 'sonner';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: Cart;
  onPlaceOrder: (orderData: {
    pharmacy_id: string;
    delivery_address: string;
    delivery_phone: string;
    delivery_instructions?: string;
    prescription_id?: string;
  }) => void;
  isLoading: boolean;
}

export const CheckoutModal = ({ 
  isOpen, 
  onClose, 
  cart, 
  onPlaceOrder, 
  isLoading 
}: CheckoutModalProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    pharmacy_id: '',
    delivery_address: '',
    delivery_phone: '',
    delivery_instructions: '',
    prescription_id: ''
  });

  const safeCart = cart ?? { items: [], total: 0 };
  const requiresPrescription = (safeCart.items || []).some(item => item.product?.requires_prescription);

  // Get user's prescriptions
  const { data: prescriptions } = useQuery({
    queryKey: ['user-prescriptions', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comprehensive_prescriptions')
        .select('*')
        .eq('patient_id', user.id)
        .order('prescribed_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && requiresPrescription
  });

  // Get unique pharmacies from cart items
  const pharmacies = (safeCart.items || []).reduce((acc, item) => {
    const pharmacy = item.product?.pharmacy;
    if (pharmacy && !acc.find((p: any) => p.id === pharmacy.id)) {
      acc.push(pharmacy);
    }
    return acc;
  }, [] as any[]);

  // Auto-select pharmacy if there's only one
  useEffect(() => {
    if (pharmacies.length === 1 && !formData.pharmacy_id) {
      setFormData(prev => ({ ...prev, pharmacy_id: pharmacies[0].id }));
    }
  }, [pharmacies]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!safeCart.items || safeCart.items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (requiresPrescription && !formData.prescription_id) {
      toast.error('Please select a prescription for prescription medications');
      return;
    }

    // Basic phone validation (very permissive)
    const phone = (formData.delivery_phone || '').replace(/[^0-9+]/g, '');
    if (phone.length < 7) {
      toast.error('Please enter a valid phone number');
      return;
    }

    onPlaceOrder(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pharmacy">Select Pharmacy</Label>
            <Select
              value={formData.pharmacy_id}
              onValueChange={(value) => setFormData({ ...formData, pharmacy_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose pharmacy" />
              </SelectTrigger>
                <SelectContent>
                {(pharmacies || []).map((pharmacy) => (
                  <SelectItem key={pharmacy.id} value={pharmacy.id}>
                    {pharmacy.name}
                  </SelectItem>
                ))}
                </SelectContent>
            </Select>
          </div>

          {requiresPrescription && (
            <div>
              <Label htmlFor="prescription">Select Prescription</Label>
              <Select
                value={formData.prescription_id}
                onValueChange={(value) => setFormData({ ...formData, prescription_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose prescription" />
                </SelectTrigger>
                <SelectContent>
                  {((prescriptions as any[]) || []).map((prescription) => (
                    <SelectItem key={prescription.id} value={prescription.id}>
                      {prescription.medication_name} - {prescription.dosage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="address">Delivery Address</Label>
            <Textarea
              id="address"
              value={formData.delivery_address}
              onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
              placeholder="Enter your delivery address"
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.delivery_phone}
              onChange={(e) => setFormData({ ...formData, delivery_phone: e.target.value })}
              placeholder="Your phone number"
              required
            />
          </div>

          <div>
            <Label htmlFor="instructions">Delivery Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              value={formData.delivery_instructions}
              onChange={(e) => setFormData({ ...formData, delivery_instructions: e.target.value })}
              placeholder="Special delivery instructions"
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.pharmacy_id} className="flex-1">
              {isLoading ? 'Placing Order...' : `Place Order (K${(safeCart?.total ?? 0).toFixed(2)})`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
