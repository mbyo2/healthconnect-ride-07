import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Receipt,
  ArrowLeft
} from 'lucide-react';
import { PaymentGatewaySelector } from './PaymentGatewaySelector';
import { WalletCard } from './WalletCard';
import { PaymentGatewayType } from '@/types/payment-gateways';
import { paymentGatewayFactory } from '@/utils/payment-gateway-factory';
import { processPayment, ExtendedPaymentRequest, ExtendedPaymentResponse } from '@/utils/payment';

interface PaymentProcessorProps {
  amount: number;
  currency: string;
  description: string;
  appointmentId?: string;
  patientId?: string;
  onSuccess?: (paymentResponse: ExtendedPaymentResponse) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  className?: string;
}

type PaymentStep = 'gateway_selection' | 'processing' | 'success' | 'error';

export const PaymentProcessor: React.FC<PaymentProcessorProps> = ({
  amount,
  currency,
  description,
  appointmentId,
  patientId,
  onSuccess,
  onError,
  onCancel,
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState<PaymentStep>('gateway_selection');
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType | null>(null);
  const [gatewayOptions, setGatewayOptions] = useState<any>(null);
  const [paymentResponse, setPaymentResponse] = useState<ExtendedPaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [userCountry, setUserCountry] = useState('US');

  useEffect(() => {
    // Detect user country (you might want to use a geolocation service)
    detectUserCountry();
  }, []);

  const detectUserCountry = async () => {
    try {
      // Simple country detection - in production, use a proper geolocation service
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const countryMap: { [key: string]: string } = {
        'Africa/Nairobi': 'KE',
        'Africa/Lagos': 'NG',
        'Africa/Johannesburg': 'ZA',
        'Africa/Cairo': 'EG',
        'Africa/Accra': 'GH',
        'Africa/Kampala': 'UG',
        'Africa/Dar_es_Salaam': 'TZ',
        'America/New_York': 'US',
        'Europe/London': 'GB',
        'Asia/Tokyo': 'JP'
      };
      
      const detectedCountry = countryMap[timezone] || 'US';
      setUserCountry(detectedCountry);
    } catch (error) {
      console.warn('Could not detect user country:', error);
      setUserCountry('US');
    }
  };

  const handleGatewaySelect = async (gateway: PaymentGatewayType, options?: any) => {
    setSelectedGateway(gateway);
    setGatewayOptions(options);
    setCurrentStep('processing');
    setProcessing(true);
    setError(null);

    try {
      // Create payment request using the extended type
      const paymentRequest: ExtendedPaymentRequest = {
        amount,
        currency,
        patientId: patientId || 'guest',
        providerId: 'healthconnect',
        serviceId: appointmentId || 'consultation',
        paymentMethod: gateway === 'paypal' ? 'paypal' : gateway === 'wallet' ? 'wallet' : undefined,
        gatewayType: gateway,
        gatewayOptions: options,
        description,
        appointmentId
      };

      // Process payment using the updated payment utility
      const response = await processPayment(paymentRequest);
      
      if (response.success) {
        setPaymentResponse(response);
        setCurrentStep('success');
        onSuccess?.(response);
      } else {
        throw new Error(response.error || 'Payment failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMessage);
      setCurrentStep('error');
      onError?.(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleRetry = () => {
    setCurrentStep('gateway_selection');
    setSelectedGateway(null);
    setGatewayOptions(null);
    setError(null);
    setPaymentResponse(null);
  };

  const handleCancel = () => {
    setCurrentStep('gateway_selection');
    setSelectedGateway(null);
    setGatewayOptions(null);
    setError(null);
    onCancel?.();
  };

  const renderPaymentSummary = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Receipt className="w-5 h-5 mr-2" />
          Payment Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Description:</span>
            <span className="font-medium">{description}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-bold text-lg">{currency} {amount.toFixed(2)}</span>
          </div>
          {appointmentId && (
            <div className="flex justify-between">
              <span className="text-gray-600">Appointment ID:</span>
              <span className="font-mono text-sm">{appointmentId}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderGatewaySelection = () => (
    <div className="space-y-6">
      {renderPaymentSummary()}
      
      {/* Show wallet card for quick wallet payments */}
      <WalletCard />
      
      <Separator className="my-6" />
      
      <PaymentGatewaySelector
        amount={amount}
        currency={currency}
        userCountry={userCountry}
        onGatewaySelect={handleGatewaySelect}
      />
    </div>
  );

  const renderProcessing = () => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Processing Payment</h3>
        <p className="text-gray-600 text-center mb-4">
          {selectedGateway === 'paypal' && 'Connecting to PayPal...'}
          {selectedGateway === 'wallet' && 'Processing wallet payment...'}
          {selectedGateway === 'dpo' && 'Connecting to DPO Pay...'}
          {!['paypal', 'wallet', 'dpo'].includes(selectedGateway || '') && 'Processing your payment...'}
        </p>
        <p className="text-sm text-gray-500">
          Please do not close this window or navigate away.
        </p>
      </CardContent>
    </Card>
  );

  const renderSuccess = () => (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
        <h3 className="text-xl font-bold text-green-800 mb-2">Payment Successful!</h3>
        <p className="text-green-700 text-center mb-6">
          Your payment of {currency} {amount.toFixed(2)} has been processed successfully.
        </p>
        
        {paymentResponse && (
          <div className="w-full max-w-md space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payment ID:</span>
              <span className="font-mono">{paymentResponse.paymentId}</span>
            </div>
            {paymentResponse.transactionId && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-mono">{paymentResponse.transactionId}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status:</span>
              <Badge variant="default" className="bg-green-600">
                {paymentResponse.status}
              </Badge>
            </div>
          </div>
        )}

        {paymentResponse?.receiptUrl && (
          <Button 
            variant="outline" 
            onClick={() => window.open(paymentResponse.receiptUrl, '_blank')}
            className="mb-4"
          >
            <Receipt className="w-4 h-4 mr-2" />
            View Receipt
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const renderError = () => (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="w-16 h-16 text-red-600 mb-4" />
        <h3 className="text-xl font-bold text-red-800 mb-2">Payment Failed</h3>
        <Alert className="mb-6 border-red-300 bg-red-100">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            {error || 'An unexpected error occurred while processing your payment.'}
          </AlertDescription>
        </Alert>
        
        <div className="flex space-x-4">
          <Button onClick={handleRetry} variant="default">
            Try Again
          </Button>
          <Button onClick={handleCancel} variant="outline">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* Header with back button for non-selection steps */}
      {currentStep !== 'gateway_selection' && (
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={currentStep === 'processing' ? undefined : handleRetry}
            disabled={currentStep === 'processing'}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold">
              {currentStep === 'processing' && 'Processing Payment'}
              {currentStep === 'success' && 'Payment Complete'}
              {currentStep === 'error' && 'Payment Error'}
            </h2>
            <p className="text-sm text-gray-600">
              {selectedGateway && `Using ${selectedGateway.charAt(0).toUpperCase() + selectedGateway.slice(1)}`}
            </p>
          </div>
        </div>
      )}

      {/* Step content */}
      {currentStep === 'gateway_selection' && renderGatewaySelection()}
      {currentStep === 'processing' && renderProcessing()}
      {currentStep === 'success' && renderSuccess()}
      {currentStep === 'error' && renderError()}
    </div>
  );
};

export default PaymentProcessor;
