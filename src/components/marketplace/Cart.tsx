
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Cart as CartType } from '@/types/marketplace';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';

interface CartProps {
  cart: CartType;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
  isLoading?: boolean;
}

export const Cart = ({ 
  cart, 
  onUpdateQuantity, 
  onRemoveItem, 
  onCheckout,
  isLoading = false 
}: CartProps) => {
  if (cart.items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Your cart is empty</p>
        </CardContent>
      </Card>
    );
  }

  const requiresPrescription = cart.items.some(item => item.product.requires_prescription);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Shopping Cart ({cart.items.length} items)
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {cart.items.map((item) => (
          <div key={item.product.id} className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="flex-1">
              <h4 className="font-semibold">{item.product.medication_name}</h4>
              <p className="text-sm text-muted-foreground">{item.product.dosage}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium">K{item.product.price}</span>
                {item.product.requires_prescription && (
                  <Badge variant="outline" className="text-xs">Rx Required</Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => onUpdateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                className="w-16 text-center"
                min="0"
              />
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="text-right">
              <p className="font-semibold">K{item.subtotal.toFixed(2)}</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemoveItem(item.product.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}

        {requiresPrescription && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-orange-800 text-sm font-medium">
              ⚠️ This order contains prescription medications. You will need to provide a valid prescription during checkout.
            </p>
          </div>
        )}

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-xl font-bold text-green-600">K{cart.total.toFixed(2)}</span>
          </div>
          
          <Button 
            onClick={onCheckout} 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Proceed to Checkout'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
