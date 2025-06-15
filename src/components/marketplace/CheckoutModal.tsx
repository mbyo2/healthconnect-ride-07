
import React, { useState } from 'react';
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

  const requiresPrescription = cart.items.some(item => item.product.requires_prescription);

  // Get user's prescriptions
  const { data: prescriptions } = useQuery({
    queryKey: ['user-prescriptions', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', user.id)
        .order('prescribed_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && requiresPrescription
  });

  // Get unique pharmacies from cart items
  const pharmacies = cart.items.reduce((acc, item) => {
    if (item.product.pharmacy && !acc.find(p => p.id === item.product.pharmacy!.id)) {
      acc.push(item.product.pharmacy);
    }
    return acc;
  }, [] as any[]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (requiresPrescription && !formData.prescription_id) {
      alert('Please select a prescription for prescription medications');
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
                {pharmacies.map((pharmacy) => (
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
                  {prescriptions?.map((prescription) => (
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
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Placing Order...' : `Place Order (K${cart.total.toFixed(2)})`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
