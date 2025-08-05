import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, CheckCircle, AlertCircle, Clock, CreditCard, FileCheck, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface InsuranceInfo {
  id: string;
  provider_name: string;
  policy_number: string;
  group_number?: string;
  coverage_start_date: string;
  coverage_end_date?: string;
}

interface InsuranceVerification {
  id: string;
  verification_status: string;
  coverage_details: any;
  copay_amount?: number;
  deductible_remaining?: number;
  coverage_percentage?: number;
  pre_authorization_required: boolean;
  verification_date: string;
  expiry_date?: string;
  verification_notes?: string;
  insurance_info: InsuranceInfo;
}

const statusConfig = {
  pending: { 
    label: 'Verification Pending', 
    className: 'bg-yellow-100 text-yellow-800', 
    icon: Clock,
    description: 'Insurance verification is in progress'
  },
  verified: { 
    label: 'Verified', 
    className: 'bg-green-100 text-green-800', 
    icon: CheckCircle,
    description: 'Insurance coverage has been verified'
  },
  denied: { 
    label: 'Verification Failed', 
    className: 'bg-red-100 text-red-800', 
    icon: AlertCircle,
    description: 'Insurance verification was denied or failed'
  },
  expired: { 
    label: 'Verification Expired', 
    className: 'bg-gray-100 text-gray-800', 
    icon: AlertCircle,
    description: 'Insurance verification has expired and needs renewal'
  }
};

export const InsuranceVerificationSystem = () => {
  const { user } = useAuth();
  const [verifications, setVerifications] = useState<InsuranceVerification[]>([]);
  const [insuranceInfo, setInsuranceInfo] = useState<InsuranceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch insurance information
      const { data: insuranceData, error: insuranceError } = await supabase
        .from('insurance_information')
        .select('*')
        .eq('patient_id', user?.id);

      if (insuranceError) throw insuranceError;
      setInsuranceInfo(insuranceData || []);

      // Fetch insurance verifications
      const { data: verificationData, error: verificationError } = await supabase
        .from('insurance_verifications')
        .select(`
          *,
          insurance_information (
            id,
            provider_name,
            policy_number,
            group_number,
            coverage_start_date,
            coverage_end_date
          )
        `)
        .eq('patient_id', user?.id)
        .order('verification_date', { ascending: false });

      if (verificationError) throw verificationError;
      setVerifications((verificationData || []).map(v => ({
        ...v,
        insurance_info: v.insurance_information
      })));
    } catch (error) {
      console.error('Error fetching insurance data:', error);
      toast.error('Failed to load insurance information');
    } finally {
      setLoading(false);
    }
  };

  const requestVerification = async (insuranceId: string) => {
    try {
      setVerifying(true);
      
      // Create a new verification request
      const { data, error } = await supabase
        .from('insurance_verifications')
        .insert({
          patient_id: user?.id,
          insurance_info_id: insuranceId,
          verification_status: 'pending',
          verification_date: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Insurance verification requested. You will be notified once complete.');
      fetchData();
    } catch (error) {
      console.error('Error requesting verification:', error);
      toast.error('Failed to request insurance verification');
    } finally {
      setVerifying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Clock;
    
    return (
      <Badge className={config?.className || 'bg-gray-100 text-gray-800'}>
        <Icon className="h-3 w-3 mr-1" />
        {config?.label || status}
      </Badge>
    );
  };

  const isVerificationExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const getCoveragePercentage = (verification: InsuranceVerification) => {
    return verification.coverage_percentage || 0;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Insurance Verification</h2>
          <p className="text-muted-foreground">Verify your insurance coverage and benefits</p>
        </div>
      </div>

      {/* Insurance Information Cards */}
      {insuranceInfo.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Insurance Information</h3>
            <p className="text-muted-foreground mb-4">
              Add your insurance information to verify coverage
            </p>
            <Button>Add Insurance Information</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {insuranceInfo.map((insurance) => {
            const latestVerification = verifications.find(v => v.insurance_info?.id === insurance.id);
            const hasActiveVerification = latestVerification && 
              latestVerification.verification_status === 'verified' && 
              !isVerificationExpired(latestVerification.expiry_date);

            return (
              <Card key={insurance.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-6 w-6 text-blue-600" />
                      <div>
                        <CardTitle className="text-lg">{insurance.provider_name}</CardTitle>
                        <CardDescription>
                          Policy: {insurance.policy_number}
                          {insurance.group_number && ` • Group: ${insurance.group_number}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {latestVerification ? (
                        getStatusBadge(latestVerification.verification_status)
                      ) : (
                        <Badge variant="outline">Not Verified</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Coverage Period */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Coverage Start:</span>
                      <p>{format(new Date(insurance.coverage_start_date), 'PPP')}</p>
                    </div>
                    {insurance.coverage_end_date && (
                      <div>
                        <span className="font-medium text-muted-foreground">Coverage End:</span>
                        <p>{format(new Date(insurance.coverage_end_date), 'PPP')}</p>
                      </div>
                    )}
                  </div>

                  {/* Verification Details */}
                  {latestVerification && latestVerification.verification_status === 'verified' && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <FileCheck className="h-4 w-4" />
                        Coverage Details
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        {latestVerification.copay_amount && (
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium text-muted-foreground">Copay:</span>
                              <p>${latestVerification.copay_amount}</p>
                            </div>
                          </div>
                        )}
                        
                        {latestVerification.deductible_remaining !== null && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium text-muted-foreground">Deductible Remaining:</span>
                              <p>${latestVerification.deductible_remaining}</p>
                            </div>
                          </div>
                        )}
                        
                        {latestVerification.coverage_percentage && (
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium text-muted-foreground">Coverage:</span>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={getCoveragePercentage(latestVerification)} 
                                  className="w-16 h-2"
                                />
                                <span className="text-xs">
                                  {getCoveragePercentage(latestVerification)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {latestVerification.pre_authorization_required && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-800">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-medium text-sm">Pre-authorization Required</span>
                          </div>
                          <p className="text-xs text-yellow-700 mt-1">
                            Some services may require pre-authorization from your insurance provider.
                          </p>
                        </div>
                      )}

                      {latestVerification.verification_notes && (
                        <div className="mt-3">
                          <span className="font-medium text-muted-foreground text-sm">Notes:</span>
                          <p className="text-sm mt-1 text-muted-foreground">
                            {latestVerification.verification_notes}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Verified on {format(new Date(latestVerification.verification_date), 'PPP')}
                          {latestVerification.expiry_date && (
                            <span> • Expires {format(new Date(latestVerification.expiry_date), 'PPP')}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Coverage Details from JSON */}
                  {latestVerification?.coverage_details && 
                   Object.keys(latestVerification.coverage_details).length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Additional Coverage Information</h4>
                      <div className="bg-muted p-3 rounded-lg">
                        <pre className="text-xs text-muted-foreground overflow-auto">
                          {JSON.stringify(latestVerification.coverage_details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {!hasActiveVerification && (
                      <Button 
                        size="sm"
                        onClick={() => requestVerification(insurance.id)}
                        disabled={verifying}
                      >
                        {verifying ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Requesting...
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Verify Coverage
                          </>
                        )}
                      </Button>
                    )}
                    
                    {latestVerification && isVerificationExpired(latestVerification.expiry_date) && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => requestVerification(insurance.id)}
                        disabled={verifying}
                      >
                        Re-verify Coverage
                      </Button>
                    )}
                  </div>

                  {/* Warning for expired verification */}
                  {latestVerification && isVerificationExpired(latestVerification.expiry_date) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium text-sm">Verification Expired</span>
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">
                        Your insurance verification has expired. Please re-verify to ensure accurate coverage information.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Verification History */}
      {verifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Verification History</CardTitle>
            <CardDescription>Past insurance verification requests and results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {verifications.slice(0, 5).map((verification, index) => (
                <div key={verification.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-sm">
                      <p className="font-medium">
                        {verification.insurance_info?.provider_name} • {verification.insurance_info?.policy_number}
                      </p>
                      <p className="text-muted-foreground">
                        {format(new Date(verification.verification_date), 'PPP')}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(verification.verification_status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};