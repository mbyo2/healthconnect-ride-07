import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from "@/hooks/use-currency";
import {
    FlaskConical,
    ClipboardList,
    Search,
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle,
    FileText,
    Microscope,
    Loader2
} from 'lucide-react';
import { LabRequest, LabTest, LabTestStatus } from '@/types/lab';
import { toast } from 'sonner';
import { InstitutionInsuranceVerification } from '@/components/institution/InstitutionInsuranceVerification';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LabManagement = () => {
    const { user } = useAuth();
    const { formatPrice } = useCurrency();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
    const [resultSummary, setResultSummary] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [selectedTestType, setSelectedTestType] = useState('');
    const [selectedVerification, setSelectedVerification] = useState<any>(null);
    const queryClient = useQueryClient();

    // Fetch Lab Requests
    const { data: requests, isLoading } = useQuery({
        queryKey: ['lab-requests'],
        queryFn: async () => {
            try {
                const { data, error } = await supabase
                    .from('lab_tests')
                    .select('*, patient:profiles!patient_id(first_name, last_name), provider:profiles!ordered_by(first_name, last_name)')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return data as any[];
            } catch (e) {
                if (import.meta.env.DEV) {
                    console.log('Using mock lab data as table might not exist yet');
                }
                return MOCK_REQUESTS as any[];
            }
        }
    });

    // Fetch Patients
    const { data: patients } = useQuery({
        queryKey: ['lab-patients'],
        queryFn: async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email')
                .limit(50);
            return data || [];
        }
    });

    // Lab Test Catalog (for selection)
    const TEST_CATALOG = [
        { name: 'Complete Blood Count (CBC)', code: 'HEM-001', category: 'Hematology', price: 150 },
        { name: 'Lipid Profile', code: 'BIO-001', category: 'Biochemistry', price: 200 },
        { name: 'Liver Function Test', code: 'BIO-002', category: 'Biochemistry', price: 250 },
        { name: 'Urinalysis', code: 'MIC-001', category: 'Microbiology', price: 80 },
        { name: 'Thyroid Panel', code: 'IMM-001', category: 'Immunology', price: 300 },
    ];

    const submitResult = async () => {
        if (!selectedRequest || !resultSummary) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('lab_tests')
                .update({
                    result_summary: resultSummary,
                    status: 'completed',
                    results_date: new Date().toISOString()
                })
                .eq('id', selectedRequest.id);

            if (error) throw error;
            toast.success('Results submitted successfully');
            setSelectedRequest(null);
            setResultSummary('');
            queryClient.invalidateQueries({ queryKey: ['lab-requests'] });
        } catch (error) {
            console.error('Error submitting results:', error);
            toast.error('Failed to submit results');
        } finally {
            setIsSubmitting(false);
        }
    };

    const createRequest = async () => {
        if (!selectedPatientId || !selectedTestType || !user) return;
        setIsSubmitting(true);
        try {
            const test = TEST_CATALOG.find(t => t.name === selectedTestType);
            const total = test?.price || 0;
            let balance = total;
            let insuranceClaimId = null;

            if (selectedVerification) {
                const coverage = selectedVerification.coverage_percentage || 0;
                const coveredAmount = (total * coverage) / 100;
                balance = total - coveredAmount;
                insuranceClaimId = selectedVerification.id;
            }

            const { error } = await supabase
                .from('lab_tests')
                .insert({
                    patient_id: selectedPatientId,
                    ordered_by: user.id,
                    lab_id: user.id, // Assuming lab tech is the lab_id for now or fetch institution
                    test_type: selectedTestType,
                    test_number: `LAB-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                    status: 'pending',
                    price: total,
                    total_amount: total,
                    balance: balance,
                    insurance_claim_id: insuranceClaimId,
                    payment_status: balance === 0 ? 'paid' : 'pending'
                });

            if (error) throw error;
            toast.success('Lab request created successfully');
            setShowNewRequestDialog(false);
            setSelectedPatientId('');
            setPatientSearchTerm('');
            setSelectedTestType('');
            setSelectedVerification(null);
            queryClient.invalidateQueries({ queryKey: ['lab-requests'] });
        } catch (error) {
            console.error('Error creating lab request:', error);
            toast.error('Failed to create lab request');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Stats
    const pendingRequests = requests?.filter(r => r.status === 'pending') || [];
    const inProgressRequests = requests?.filter(r => r.status === 'in_progress') || [];
    const completedRequests = requests?.filter(r => r.status === 'completed') || [];

    const getStatusBadge = (status: LabTestStatus) => {
        switch (status) {
            case 'pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">Pending</Badge>;
            case 'in_progress': return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800">In Progress</Badge>;
            case 'completed': return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">Completed</Badge>;
            case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPriorityIcon = (priority: string) => {
        if (priority === 'urgent' || priority === 'stat') {
            return <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />;
        }
        return <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />;
    };

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                        <Microscope className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        Lab Management
                    </h1>
                    <p className="text-muted-foreground">Pathology and Diagnostics Portal</p>
                </div>
                <div className="flex gap-3">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New Test Request
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
                            Pending Requests
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingRequests.length}</div>
                        <p className="text-xs text-muted-foreground">Awaiting processing</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FlaskConical className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                            In Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{inProgressRequests.length}</div>
                        <p className="text-xs text-muted-foreground">Currently being analyzed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
                            Completed Today
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedRequests.filter(r => new Date(r.updated_at).toDateString() === new Date().toDateString()).length}</div>
                        <p className="text-xs text-muted-foreground">Results released</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="requests" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="requests">Requests</TabsTrigger>
                    <TabsTrigger value="results">Results Entry</TabsTrigger>
                    <TabsTrigger value="catalog">Test Catalog</TabsTrigger>
                </TabsList>

                {/* Requests Tab */}
                <TabsContent value="requests" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <CardTitle>Lab Requests</CardTitle>
                                <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="h-4 w-4 mr-2" />
                                            New Request
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px]">
                                        <DialogHeader>
                                            <DialogTitle>Create New Lab Request</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Patient</Label>
                                                <Input
                                                    placeholder="Search patient..."
                                                    value={patientSearchTerm}
                                                    onChange={(e) => setPatientSearchTerm(e.target.value)}
                                                />
                                                {patientSearchTerm && !selectedPatientId && (
                                                    <div className="max-h-32 overflow-y-auto border rounded-md bg-background">
                                                        {patients?.filter(p =>
                                                            `${p.first_name} ${p.last_name}`.toLowerCase().includes(patientSearchTerm.toLowerCase())
                                                        ).map(p => (
                                                            <div
                                                                key={p.id}
                                                                className="p-2 text-sm hover:bg-accent cursor-pointer"
                                                                onClick={() => {
                                                                    setSelectedPatientId(p.id);
                                                                    setPatientSearchTerm(`${p.first_name} ${p.last_name}`);
                                                                }}
                                                            >
                                                                {p.first_name} {p.last_name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Test Type</Label>
                                                <Select value={selectedTestType} onValueChange={setSelectedTestType}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select test type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {TEST_CATALOG.map(test => (
                                                            <SelectItem key={test.code} value={test.name}>
                                                                {test.name} ({formatPrice(test.price)})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {selectedPatientId && (
                                                <div className="space-y-2">
                                                    <InstitutionInsuranceVerification
                                                        patientId={selectedPatientId}
                                                        onVerified={(v) => setSelectedVerification(v)}
                                                    />
                                                    {selectedVerification && (
                                                        <div className="p-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 rounded text-xs flex items-center gap-2">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            <span>Insurance Applied: {selectedVerification.coverage_percentage}%</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setShowNewRequestDialog(false)}>Cancel</Button>
                                            <Button onClick={createRequest} disabled={!selectedPatientId || !selectedTestType || isSubmitting}>
                                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Create Request
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search patient or test..."
                                    className="max-w-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {requests?.filter(r =>
                                    r.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    r.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    r.test?.name.toLowerCase().includes(searchTerm.toLowerCase())
                                ).map((request) => (
                                    <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-2 rounded-full ${request.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted'}`}>
                                                {getPriorityIcon(request.priority)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold">{request.test?.name || 'Unknown Test'}</h4>
                                                    {getStatusBadge(request.status)}
                                                </div>
                                                <p className="text-sm font-medium mt-1">
                                                    Patient: {request.patient?.first_name} {request.patient?.last_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Requested: {new Date(request.created_at).toLocaleDateString()} • Dr. {request.provider?.last_name || 'Unknown'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {request.status === 'pending' && (
                                                <Button size="sm" onClick={() => toast.success('Sample collected')}>
                                                    Collect Sample
                                                </Button>
                                            )}
                                            {request.status === 'in_progress' && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => setSelectedRequest(request)}
                                                >
                                                    Enter Result
                                                </Button>
                                            )}
                                            <Button size="sm" variant="outline">Details</Button>
                                        </div>
                                    </div>
                                ))}
                                {requests?.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No requests found
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Results Entry Tab */}
                <TabsContent value="results">
                    <Card>
                        <CardHeader>
                            <CardTitle>Results Entry</CardTitle>
                            <CardDescription>Enter and verify test results</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {selectedRequest ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-accent/50 rounded-lg">
                                        <h4 className="font-semibold">{selectedRequest.test_type || (selectedRequest as any).test?.name}</h4>
                                        <p className="text-sm">Patient: {selectedRequest.patient?.first_name} {selectedRequest.patient?.last_name}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Result Summary</label>
                                        <textarea
                                            className="w-full min-h-[150px] p-3 rounded-md border bg-background"
                                            placeholder="Enter detailed test results and findings..."
                                            value={resultSummary}
                                            onChange={(e) => setResultSummary(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => setSelectedRequest(null)}
                                        >Cancel</Button>
                                        <Button
                                            onClick={submitResult}
                                            disabled={!resultSummary || isSubmitting}
                                        >
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Submit Results
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium">Select a request to enter results</h3>
                                    <p className="text-muted-foreground mt-2">
                                        Go to the Requests tab and click "Enter Result" on an in-progress test.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Catalog Tab */}
                <TabsContent value="catalog">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Test Catalog</CardTitle>
                                <Button variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Test Type
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {TEST_CATALOG.map((test, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <h4 className="font-medium">{test.name}</h4>
                                            <p className="text-xs text-muted-foreground">{test.code} • {test.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">{formatPrice(test.price)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

// Mock Data for fallback
const MOCK_REQUESTS = [
    {
        id: '1',
        status: 'pending',
        priority: 'urgent',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        patient: { first_name: 'John', last_name: 'Doe' },
        test: { name: 'Complete Blood Count (CBC)', code: 'HEM-001' },
        provider: { last_name: 'Smith' }
    },
    {
        id: '2',
        status: 'in_progress',
        priority: 'routine',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        patient: { first_name: 'Jane', last_name: 'Wilson' },
        test: { name: 'Lipid Profile', code: 'BIO-001' },
        provider: { last_name: 'Johnson' }
    },
    {
        id: '3',
        status: 'completed',
        priority: 'routine',
        created_at: new Date(Date.now() - 172800000).toISOString(),
        updated_at: new Date().toISOString(),
        patient: { first_name: 'Robert', last_name: 'Brown' },
        test: { name: 'Urinalysis', code: 'MIC-001' },
        provider: { last_name: 'Williams' }
    }
];

export default LabManagement;
