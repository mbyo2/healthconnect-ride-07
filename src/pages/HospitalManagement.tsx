import React, { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from "@/hooks/use-currency";
import { InstitutionInsuranceVerification } from '@/components/institution/InstitutionInsuranceVerification';
import {
    Building2,
    Bed,
    Users,
    DollarSign,
    Activity,
    Plus,
    CheckCircle,
} from 'lucide-react';

const HospitalManagement = () => {
    const { user } = useAuth();
    const { formatPrice, currency } = useCurrency();

    // Hospital info
    const { data: hospital } = useQuery({
        queryKey: ['hospital', user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('healthcare_institutions')
                .select('*')
                .eq('admin_id', user?.id)
                .eq('type', 'hospital')
                .single();
            return data;
        },
        enabled: !!user,
    });

    // Departments
    const { data: departments } = useQuery({
        queryKey: ['hospital-departments', hospital?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('hospital_departments')
                .select('*')
                .eq('hospital_id', hospital?.id)
                .order('name');
            return data || [];
        },
        enabled: !!hospital,
    });

    // Beds
    const { data: beds } = useQuery({
        queryKey: ['hospital-beds', hospital?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('hospital_beds')
                .select('*, department:hospital_departments(name)')
                .eq('hospital_id', hospital?.id);
            return data || [];
        },
        enabled: !!hospital,
    });

    // Admissions
    const { data: admissions } = useQuery({
        queryKey: ['hospital-admissions', hospital?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('hospital_admissions')
                .select('*, patient:profiles!patient_id(first_name, last_name), department:hospital_departments(name)')
                .eq('hospital_id', hospital?.id)
                .eq('status', 'admitted')
                .order('admission_date', { ascending: false });
            return data || [];
        },
        enabled: !!hospital,
    });

    // Billing (using hospital_billing table from migration)
    const { data: invoices, refetch: refetchInvoices } = useQuery({
        queryKey: ['hospital-billing', hospital?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('hospital_billing')
                .select('*, patient:profiles!patient_id(first_name, last_name)')
                .eq('hospital_id', hospital?.id)
                .order('created_at', { ascending: false });
            return data || [];
        },
        enabled: !!hospital,
    });

    const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [invoiceAmount, setInvoiceAmount] = useState('');
    const [invoiceDescription, setInvoiceDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedVerification, setSelectedVerification] = useState<any>(null);

    const generateInvoice = async () => {
        if (!hospital || !selectedPatientId || !invoiceAmount) return;
        setIsGenerating(true);
        try {
            const total = Number(invoiceAmount);
            let balance = total;
            let insuranceClaimId = null;

            if (selectedVerification) {
                const coverage = selectedVerification.coverage_percentage || 0;
                const coveredAmount = (total * coverage) / 100;
                balance = total - coveredAmount;
                insuranceClaimId = selectedVerification.id;
            }

            const invoiceNumber = `INV-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            const { error } = await supabase
                .from('hospital_billing')
                .insert({
                    hospital_id: hospital.id,
                    patient_id: selectedPatientId,
                    invoice_number: invoiceNumber,
                    total_amount: total,
                    balance: balance,
                    insurance_claim_id: insuranceClaimId,
                    items: [{ description: invoiceDescription, amount: total }],
                    payment_status: balance === 0 ? 'paid' : 'pending',
                    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
                });

            if (error) throw error;
            toast.success('Invoice generated successfully');
            setShowInvoiceDialog(false);
            setSelectedPatientId('');
            setInvoiceAmount('');
            setInvoiceDescription('');
            setSelectedVerification(null);
            refetchInvoices();
        } catch (error) {
            console.error('Error generating invoice:', error);
            toast.error('Failed to generate invoice');
        } finally {
            setIsGenerating(false);
        }
    };

    // Stats
    const totalBeds = beds?.length || 0;
    const occupiedBeds = beds?.filter((b) => b.status === 'occupied').length || 0;
    const availableBeds = beds?.filter((b) => b.status === 'available').length || 0;
    const occupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0;

    if (!hospital) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Hospital Found</h3>
                        <p className="text-muted-foreground">
                            You don't have access to a hospital management system.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    {hospital.name} - HMS
                </h1>
                <p className="text-muted-foreground">Hospital Management System</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Bed className="h-4 w-4" /> Total Beds
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalBeds}</div>
                        <p className="text-xs text-muted-foreground">
                            Across {departments?.length || 0} departments
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Activity className="h-4 w-4 text-green-500 dark:text-green-400" /> Occupancy Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500 dark:text-green-400">{occupancyRate}%</div>
                        <p className="text-xs text-muted-foreground">
                            {occupiedBeds} occupied, {availableBeds} available
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4" /> Active Patients
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{admissions?.length || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Building2 className="h-4 w-4" /> Departments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{departments?.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="admissions" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="admissions">Admissions</TabsTrigger>
                    <TabsTrigger value="beds">Beds</TabsTrigger>
                    <TabsTrigger value="departments">Departments</TabsTrigger>
                    <TabsTrigger value="billing">Billing</TabsTrigger>
                </TabsList>

                {/* Admissions Tab */}
                <TabsContent value="admissions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <CardTitle>Current Admissions</CardTitle>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Admission
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {admissions && admissions.length > 0 ? (
                                <div className="space-y-2">
                                    {admissions.map((admission) => (
                                        <div
                                            key={admission.id}
                                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-accent transition-colors gap-3"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold">
                                                        {admission.patient?.first_name} {admission.patient?.last_name}
                                                    </h4>
                                                    <Badge>{admission.admission_type}</Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    Admission #{admission.admission_number}
                                                </p>
                                                <div className="flex items-center gap-4 mt-2 text-sm">
                                                    <span>
                                                        Department: <strong>{admission.department?.name}</strong>
                                                    </span>
                                                    <span>Admitted: {new Date(admission.admission_date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm">
                                                    View Details
                                                </Button>
                                                <Button variant="outline" size="sm">
                                                    Discharge
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">No active admissions</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Beds Tab */}
                <TabsContent value="beds" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <CardTitle>Bed Management</CardTitle>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Bed
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {beds && beds.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {beds.map((bed) => (
                                        <Card
                                            key={bed.id}
                                            className={
                                                bed.status === 'available'
                                                    ? 'border-green-200 dark:border-green-800'
                                                    : bed.status === 'occupied'
                                                        ? 'border-blue-200 dark:border-blue-800'
                                                        : 'border-border'
                                            }
                                        >
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-sm">Bed {bed.bed_number}</CardTitle>
                                                    <Badge variant={
                                                        bed.status === 'available'
                                                            ? 'default'
                                                            : bed.status === 'occupied'
                                                                ? 'secondary'
                                                                : 'outline'
                                                    }>
                                                        {bed.status}
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground">{bed.department?.name}</p>
                                                <p className="text-sm mt-1">Type: {bed.bed_type}</p>
                                                {bed.room_number && (
                                                    <p className="text-sm">Room: {bed.room_number}</p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Bed className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">No beds configured</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Departments Tab */}
                <TabsContent value="departments" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <CardTitle>Departments</CardTitle>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Department
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {departments && departments.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {departments.map((dept) => (
                                        <Card key={dept.id}>
                                            <CardHeader>
                                                <CardTitle className="text-base">{dept.name}</CardTitle>
                                                <CardDescription>Code: {dept.code}</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm">Bed Capacity: {dept.bed_capacity}</p>
                                                {dept.description && (
                                                    <p className="text-sm text-muted-foreground mt-2">{dept.description}</p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">No departments configured</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Billing Tab */}
                <TabsContent value="billing" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Billing & Invoices</CardTitle>
                                <Button onClick={() => setShowInvoiceDialog(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Generate Invoice
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {invoices && invoices.length > 0 ? (
                                    invoices.map((invoice: any) => (
                                        <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold">{invoice.invoice_number}</h4>
                                                    <Badge variant={
                                                        invoice.payment_status === 'paid' ? 'default' :
                                                            invoice.payment_status === 'overdue' ? 'destructive' : 'outline'
                                                    }>
                                                        {invoice.payment_status}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Patient: {invoice.patient?.first_name} {invoice.patient?.last_name} • Date: {new Date(invoice.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg">{formatPrice(invoice.total_amount)}</p>
                                                <Button variant="ghost" size="sm">View</Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">No invoices found</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            {/* Generate Invoice Dialog */}
            <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generate New Invoice</DialogTitle>
                        <DialogDescription>Create a billing record for a patient.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Patient</Label>
                            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select patient" />
                                </SelectTrigger>
                                <SelectContent>
                                    {admissions?.map(a => (
                                        <SelectItem key={a.patient_id} value={a.patient_id}>
                                            {a.patient?.first_name} {a.patient?.last_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Amount ({currency === 'USD' ? '$' : 'K'})</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={invoiceAmount}
                                onChange={(e) => setInvoiceAmount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                placeholder="Consultation, Lab tests, etc."
                                value={invoiceDescription}
                                onChange={(e) => setInvoiceDescription(e.target.value)}
                            />
                        </div>

                        {selectedPatientId && (
                            <div className="space-y-4">
                                <InstitutionInsuranceVerification
                                    patientId={selectedPatientId}
                                    onVerified={(v) => setSelectedVerification(v)}
                                />
                                {selectedVerification && (
                                    <div className="p-3 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-lg text-sm flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4" />
                                        <div>
                                            <p className="font-semibold">Insurance Applied: {selectedVerification.coverage_percentage}%</p>
                                            <p>Patient Copay: {formatPrice((Number(invoiceAmount) * (100 - selectedVerification.coverage_percentage)) / 100)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>Cancel</Button>
                        <Button onClick={generateInvoice} disabled={!selectedPatientId || !invoiceAmount || isGenerating}>
                            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default HospitalManagement;
