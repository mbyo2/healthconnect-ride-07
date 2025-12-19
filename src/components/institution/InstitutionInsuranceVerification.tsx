import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';
import { InsuranceProvider } from '@/types/healthcare';

interface Props {
    patientId: string;
    onVerified: (verification: any) => void;
}

export const InstitutionInsuranceVerification = ({ patientId, onVerified }: Props) => {
    const [loading, setLoading] = useState(false);
    const [insuranceInfo, setInsuranceInfo] = useState<any[]>([]);
    const [selectedInsurance, setSelectedInsurance] = useState<any>(null);

    const fetchInsurance = async () => {
        if (!patientId) {
            toast.error('No patient selected');
            return;
        }
        setLoading(true);
        try {
            // 1. Get current user's institution and its accepted providers
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: inst, error: instError } = await supabase
                .from('healthcare_institutions')
                .select('accepted_insurance_providers')
                .eq('admin_id', user.id)
                .single();

            let acceptedProviders: string[] = [];
            if (instError) {
                // Fallback: if not admin, check if personnel
                const { data: personnel } = await supabase
                    .from('institution_personnel')
                    .select('institution:healthcare_institutions(accepted_insurance_providers)')
                    .eq('user_id', user.id)
                    .single();

                acceptedProviders = (personnel as any)?.institution?.accepted_insurance_providers || [];
            } else {
                acceptedProviders = inst?.accepted_insurance_providers || [];
            }

            // 2. Get patient's insurance
            const { data, error } = await supabase
                .from('insurance_information')
                .select('*')
                .eq('patient_id', patientId);

            if (error) throw error;

            // 3. Filter by accepted providers
            const filtered = (data || []).filter(ins =>
                acceptedProviders.length === 0 || acceptedProviders.includes(ins.provider_name)
            );

            setInsuranceInfo(filtered);

            if (filtered.length > 0) {
                setSelectedInsurance(filtered[0]);
            } else if (data && data.length > 0) {
                toast.info('Patient has insurance, but none are accepted by this institution');
            } else {
                toast.info('No insurance information found for this patient');
            }
        } catch (error) {
            console.error('Error fetching insurance:', error);
            toast.error('Failed to load insurance information');
        } finally {
            setLoading(false);
        }
    };

    const verifyInsurance = async () => {
        if (!selectedInsurance) return;
        setLoading(true);
        try {
            // Simulate verification logic for Zambian providers
            let coveragePercentage = 80;

            if (selectedInsurance.provider_name === InsuranceProvider.NHIMA) {
                coveragePercentage = 90; // NHIMA usually covers more
            } else if (selectedInsurance.provider_name === InsuranceProvider.HOLLARD_HEALTH) {
                coveragePercentage = 85;
            } else if (selectedInsurance.provider_name === InsuranceProvider.SANLAM) {
                coveragePercentage = 75;
            }

            const coverageDetails = {
                status: 'verified',
                coverage_percentage: coveragePercentage,
                copay_amount: 0,
                deductible_remaining: 0,
                provider: selectedInsurance.provider_name,
                verified_at: new Date().toISOString()
            };

            // Create verification record
            const { data, error } = await supabase
                .from('insurance_verifications')
                .insert({
                    patient_id: patientId,
                    insurance_info_id: selectedInsurance.id,
                    verification_status: 'verified',
                    coverage_details: coverageDetails,
                    coverage_percentage: coveragePercentage,
                    verification_date: new Date().toISOString(),
                    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                })
                .select()
                .single();

            if (error) throw error;

            toast.success(`Insurance verified: ${coveragePercentage}% coverage`);
            onVerified(data);
        } catch (error) {
            console.error('Error verifying insurance:', error);
            toast.error('Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" /> Insurance Verification
                </CardTitle>
            </CardHeader>
            <CardContent>
                {insuranceInfo.length === 0 ? (
                    <div className="text-center py-2">
                        <Button variant="outline" size="sm" onClick={fetchInsurance} disabled={loading}>
                            {loading ? <Clock className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                            Check Patient Insurance
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2">
                            {insuranceInfo.map((ins) => (
                                <div
                                    key={ins.id}
                                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedInsurance?.id === ins.id ? 'border-primary bg-white shadow-sm' : 'bg-white/50 hover:bg-white'
                                        }`}
                                    onClick={() => setSelectedInsurance(ins)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-sm">{ins.provider_name}</p>
                                            <p className="text-xs text-muted-foreground">Policy: {ins.policy_number}</p>
                                        </div>
                                        {selectedInsurance?.id === ins.id && <CheckCircle className="h-4 w-4 text-primary" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button className="w-full" onClick={verifyInsurance} disabled={loading || !selectedInsurance}>
                            {loading ? 'Verifying...' : 'Verify Selected Insurance'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
