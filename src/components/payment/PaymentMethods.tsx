
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'mobile_money';
  last4: string;
  expiryDate?: string;
  isDefault: boolean;
  name?: string;
  provider?: string;
}

interface PaymentMethodsProps {
  methods: PaymentMethod[];
  onAddMethod?: () => void;
  onRemoveMethod?: (id: string) => void;
  onSetDefault?: (id: string) => void;
}

export const PaymentMethods = ({
  methods,
  onAddMethod,
  onRemoveMethod,
  onSetDefault
}: PaymentMethodsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>Payment Methods</CardTitle>
        </div>
        <CardDescription>
          Manage your payment options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {methods.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No payment methods added yet
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map(method => (
              <div 
                key={method.id} 
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {method.type === 'card' ? (
                    <div className="h-8 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center text-white">
                      <CreditCard className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="h-8 w-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-md flex items-center justify-center text-white">
                      <span className="text-xs font-bold">MM</span>
                    </div>
                  )}
                  <div>
                    {method.type === 'card' ? (
                      <>
                        <p className="text-sm font-medium">•••• {method.last4}</p>
                        <p className="text-xs text-muted-foreground">
                          Expires {method.expiryDate}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">{method.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {method.provider}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {method.isDefault ? (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Default
                    </span>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onSetDefault && onSetDefault(method.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      if (onRemoveMethod) {
                        onRemoveMethod(method.id);
                        toast.success('Payment method removed');
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={onAddMethod}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Payment Method
        </Button>
      </CardContent>
    </Card>
  );
};
