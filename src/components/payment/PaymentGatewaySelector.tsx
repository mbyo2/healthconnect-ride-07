import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  Wallet, 
  Smartphone, 
  Globe, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  MapPin
} from 'lucide-react';
import { PaymentMethodOption, MobileMoneyProvider, PaymentGatewayType } from '@/types/payment-gateways';
import { paymentGatewayFactory } from '@/utils/payment-gateway-factory';

interface PaymentGatewaySelectorProps {
  amount: number;
  currency: string;
  onGatewaySelect: (gateway: PaymentGatewayType, options?: any) => void;
  userCountry?: string;
  className?: string;
}

export const PaymentGatewaySelector: React.FC<PaymentGatewaySelectorProps> = ({
  amount,
  currency,
  onGatewaySelect,
  userCountry = 'US',
  className = ''
}) => {
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType | null>(null);
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState<MobileMoneyProvider | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailablePaymentMethods();
  }, [currency, userCountry]);

  const loadAvailablePaymentMethods = () => {
    const availableMethods: PaymentMethodOption[] = [];

    // Get all gateway configurations
    const gatewayConfigs = paymentGatewayFactory.getAllGatewayConfigs();

    gatewayConfigs.forEach(config => {
      if (!config.enabled) return;

      // Check currency support
      if (!config.supportedCurrencies.includes(currency) && !config.supportedCurrencies.includes('*')) {
        return;
      }

      // Check country support
      if (!config.supportedCountries.includes(userCountry) && !config.supportedCountries.includes('*')) {
        return;
      }

      // Check amount limits
      if (amount < config.limits.min || amount > config.limits.max) {
        return;
      }

      const method: PaymentMethodOption = {
        id: config.id,
        name: config.name,
        type: config.type,
        icon: getGatewayIcon(config.type),
        description: getGatewayDescription(config.type),
        enabled: config.enabled,
        processingTime: getProcessingTime(config.type),
        fees: getFeeDescription(config.fees),
        supportedRegions: config.supportedCountries,
        mobileMoneyProviders: config.type === 'dpo' ? ['mtn', 'airtel', 'vodacom', 'orange'] : undefined
      };

      availableMethods.push(method);
    });

    setPaymentMethods(availableMethods);
  };

  const getGatewayIcon = (type: PaymentGatewayType): string => {
    const icons = {
      paypal: '💙',
      dpo: '🌍',
      wallet: '💰',
      stripe: '💳',
      flutterwave: '🦋',
      mobile_money: '📱'
    };
    return icons[type] || '💳';
  };

  const getGatewayDescription = (type: PaymentGatewayType): string => {
    const descriptions = {
      paypal: 'Pay with PayPal, credit cards, or bank account',
      dpo: 'Pay with cards, mobile money, or bank transfer',
      wallet: 'Pay instantly from your HealthConnect wallet',
      stripe: 'Secure card payments powered by Stripe',
      flutterwave: 'African payment solutions',
      mobile_money: 'Pay with mobile money'
    };
    return descriptions[type] || 'Secure payment processing';
  };

  const getProcessingTime = (type: PaymentGatewayType): string => {
    const times = {
      paypal: 'Instant',
      dpo: '1-3 minutes',
      wallet: 'Instant',
      stripe: 'Instant',
      flutterwave: '1-2 minutes',
      mobile_money: '1-5 minutes'
    };
    return times[type] || 'Processing time varies';
  };

  const getFeeDescription = (fees: { percentage: number; fixed: number; currency: string }): string => {
    if (fees.percentage === 0 && fees.fixed === 0) {
      return 'No fees';
    }
    
    let feeText = '';
    if (fees.percentage > 0) {
      feeText += `${fees.percentage}%`;
    }
    if (fees.fixed > 0) {
      if (feeText) feeText += ' + ';
      feeText += `${fees.fixed} ${fees.currency}`;
    }
    return feeText;
  };

  const handleGatewaySelect = (gateway: PaymentGatewayType) => {
    setSelectedGateway(gateway);
    
    // For gateways that don't need additional options, proceed immediately
    if (gateway !== 'dpo' && gateway !== 'mobile_money') {
      onGatewaySelect(gateway);
    }
  };

  const handleProceedWithOptions = () => {
    if (!selectedGateway) return;

    const options: any = {};
    
    if (selectedGateway === 'dpo' && mobileMoneyProvider) {
      options.mobileMoneyProvider = mobileMoneyProvider;
      options.phoneNumber = phoneNumber;
    }

    onGatewaySelect(selectedGateway, options);
  };

  const getMobileMoneyProviders = (): { value: MobileMoneyProvider; label: string; countries: string[] }[] => [
    { value: 'mtn', label: 'MTN Mobile Money', countries: ['UG', 'GH', 'CI', 'CM', 'BF'] },
    { value: 'airtel', label: 'Airtel Money', countries: ['KE', 'UG', 'TZ', 'ZM', 'MW'] },
    { value: 'vodacom', label: 'Vodacom M-Pesa', countries: ['TZ', 'CD', 'MZ', 'LS'] },
    { value: 'orange', label: 'Orange Money', countries: ['CI', 'SN', 'ML', 'BF', 'NE'] },
    { value: 'tigo', label: 'Tigo Pesa', countries: ['TZ', 'GH'] },
    { value: 'mpesa', label: 'M-Pesa', countries: ['KE', 'TZ', 'AF', 'IN'] }
  ];

  if (paymentMethods.length === 0) {
    return (
      <Alert className="border-yellow-500 bg-yellow-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No payment methods available for {currency} {amount} in your region. Please try a different amount or contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Select Payment Method
          </CardTitle>
          <CardDescription>
            Choose how you'd like to pay {currency} {amount.toFixed(2)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentMethods.map((method) => (
              <Card 
                key={method.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedGateway === method.type ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => handleGatewaySelect(method.type)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{method.icon}</div>
                      <div>
                        <h3 className="font-semibold">{method.name}</h3>
                        <p className="text-sm text-gray-600">{method.description}</p>
                      </div>
                    </div>
                    {selectedGateway === method.type && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {method.processingTime}
                      </span>
                      <span className="flex items-center">
                        <DollarSign className="w-3 h-3 mr-1" />
                        {method.fees}
                      </span>
                    </div>
                    {method.type === 'dpo' && !method.enabled && (
                      <Badge variant="secondary" className="text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </div>

                  {method.mobileMoneyProviders && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">
                        Mobile Money: {method.mobileMoneyProviders.join(', ').toUpperCase()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* DPO Pay Mobile Money Options */}
      {selectedGateway === 'dpo' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="w-5 h-5 mr-2" />
              Mobile Money Options
            </CardTitle>
            <CardDescription>
              Select your mobile money provider and enter your phone number
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mobile-provider">Mobile Money Provider</Label>
              <Select 
                value={mobileMoneyProvider || ''} 
                onValueChange={(value) => setMobileMoneyProvider(value as MobileMoneyProvider)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your mobile money provider" />
                </SelectTrigger>
                <SelectContent>
                  {getMobileMoneyProviders()
                    .filter(provider => provider.countries.includes(userCountry))
                    .map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{provider.label}</span>
                        <div className="flex items-center ml-2">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span className="text-xs text-gray-500">
                            {provider.countries.join(', ')}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="phone-number">Phone Number</Label>
              <Input
                id="phone-number"
                type="tel"
                placeholder="Enter your mobile money phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the phone number registered with your mobile money account
              </p>
            </div>

            {mobileMoneyProvider && (
              <Alert className="border-blue-200 bg-blue-50">
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  You'll receive a prompt on your phone to authorize the payment of {currency} {amount.toFixed(2)} 
                  from your {mobileMoneyProvider.toUpperCase()} account.
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleProceedWithOptions}
              disabled={!mobileMoneyProvider || !phoneNumber.trim() || loading}
              className="w-full"
            >
              {loading ? 'Processing...' : `Pay with ${mobileMoneyProvider?.toUpperCase() || 'Mobile Money'}`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Gateway Not Available Notice */}
      {selectedGateway === 'dpo' && !paymentMethods.find(m => m.type === 'dpo')?.enabled && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>DPO Pay Integration Coming Soon!</strong>
            <br />
            We're working on integrating DPO Pay with mobile money support (MTN, Airtel, Vodacom, Orange). 
            This will enable seamless payments across Africa. For now, please use PayPal or your wallet.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PaymentGatewaySelector;
