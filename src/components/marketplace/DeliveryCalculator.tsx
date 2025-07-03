import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Truck, AlertTriangle, Phone, CheckCircle } from 'lucide-react';
import { MarketplaceProduct } from '@/types/marketplace';

interface DeliveryOption {
  id: string;
  zone: string;
  fee: number;
  time: string;
  restrictions: string[];
  available: boolean;
}

interface DeliveryCalculatorProps {
  product: MarketplaceProduct;
  quantity: number;
  onDeliverySelect: (option: DeliveryOption | null) => void;
}

export const DeliveryCalculator = ({ product, quantity, onDeliverySelect }: DeliveryCalculatorProps) => {
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [userLocation, setUserLocation] = useState<string>('');

  // Sample delivery zones for Lusaka, Zambia
  const deliveryZones: DeliveryOption[] = [
    {
      id: '1',
      zone: 'Lusaka Central (CBD)',
      fee: 25,
      time: '30-45 minutes',
      restrictions: [],
      available: true
    },
    {
      id: '2', 
      zone: 'Chilenje, Roma, Kabulonga',
      fee: 35,
      time: '45-60 minutes',
      restrictions: product.requires_prescription ? ['Prescription verification required'] : [],
      available: true
    },
    {
      id: '3',
      zone: 'Chawama, Kalingalinga, Mtendere',
      fee: 40,
      time: '60-90 minutes',
      restrictions: product.requires_prescription ? ['Prescription verification required'] : [],
      available: true
    },
    {
      id: '4',
      zone: 'Chelston, Avondale, Olympia',
      fee: 45,
      time: '60-90 minutes',
      restrictions: [],
      available: true
    }
  ];

  // Check if product can be delivered based on Zambian regulations
  const canBeDelivered = (product: MarketplaceProduct): boolean => {
    const restrictedCategories = [
      'Controlled substances',
      'Narcotic medications', 
      'Schedule drugs',
      'Injectable medications'
    ];
    
    return !restrictedCategories.some(cat => 
      product.category.toLowerCase().includes(cat.toLowerCase())
    );
  };

  const getRestrictionReason = (product: MarketplaceProduct): string => {
    if (product.category.toLowerCase().includes('controlled')) {
      return 'Controlled substances require in-person pickup under Zambian law';
    }
    if (product.category.toLowerCase().includes('injectable')) {
      return 'Injectable medications require pharmacy administration';
    }
    if (product.category.toLowerCase().includes('narcotic')) {
      return 'Narcotic medications require in-person verification';
    }
    return 'This medication requires pharmacy pickup';
  };

  const selectDeliveryOption = (option: DeliveryOption) => {
    setSelectedZone(option.id);
    onDeliverySelect(option);
  };

  const selectPickup = () => {
    setSelectedZone('pickup');
    onDeliverySelect(null);
  };

  if (!canBeDelivered(product)) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Pharmacy Pickup Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-orange-700 mb-4">
            {getRestrictionReason(product)}
          </p>
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <MapPin className="h-4 w-4" />
            Available for pickup at participating pharmacies
          </div>
          <Button
            onClick={selectPickup}
            className="w-full mt-4 bg-orange-600 hover:bg-orange-700"
          >
            Select Pharmacy Pickup (Free)
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Delivery Options in Lusaka
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Delivery Zones */}
        <div className="space-y-3">
          {deliveryZones.map((zone) => (
            <div
              key={zone.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedZone === zone.id 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => selectDeliveryOption(zone)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{zone.zone}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {zone.time}
                    </span>
                    <span className="font-medium text-foreground">
                      K{zone.fee} delivery fee
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
              
              {!zone.available && (
                <Badge variant="destructive" className="mt-2">
                  Currently Unavailable
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Pharmacy Pickup Option */}
        <div
          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
            selectedZone === 'pickup' 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={selectPickup}
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
        </div>

        {/* Safety Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">Delivery Safety Notice</p>
              <p className="text-blue-700">
                • ID verification required for prescription medications<br/>
                • Secure packaging ensures medication integrity<br/>
                • Contact {' '}
                <a href="tel:+260977123456" className="underline font-medium">
                  +260 977 123456
                </a> for delivery tracking
              </p>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        {product.requires_prescription && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-800">
              <Phone className="h-4 w-4" />
              <span className="font-medium">Prescription Required</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Valid prescription must be provided before delivery. 
              Our pharmacist will verify your prescription during delivery.
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          * Delivery times may vary due to traffic conditions in Lusaka. 
          Free delivery available for orders over K200.
        </div>
      </CardContent>
    </Card>
  );
};