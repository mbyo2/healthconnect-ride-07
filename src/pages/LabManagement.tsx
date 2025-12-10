import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
    FlaskConical,
    ClipboardList,
    Search,
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle,
    FileText,
    Microscope
} from 'lucide-react';
import { LabRequest, LabTest, LabTestStatus } from '@/types/lab';
import { toast } from 'sonner';

const LabManagement = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const queryClient = useQueryClient();

    // Fetch Lab Requests
    const { data: requests, isLoading } = useQuery({
        queryKey: ['lab-requests'],
        queryFn: async () => {
            // In a real scenario, we'd fetch from 'lab_requests' table
            // For now, we'll try to fetch from a hypothetical table or return mock data if it fails
            try {
                const { data, error } = await (supabase as any)
                    .from('lab_requests')
                    .select('*, patient:profiles!patient_id(first_name, last_name), test:lab_tests(name, code, category)')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return data as LabRequest[];
            } catch (e) {
                console.log('Using mock lab data as table might not exist yet');
                return MOCK_REQUESTS as unknown as LabRequest[];
            }
        }
    });

    // Stats
    const pendingRequests = requests?.filter(r => r.status === 'pending') || [];
    const inProgressRequests = requests?.filter(r => r.status === 'in_progress') || [];
    const completedRequests = requests?.filter(r => r.status === 'completed') || [];

    const getStatusBadge = (status: LabTestStatus) => {
        switch (status) {
            case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
            case 'in_progress': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Progress</Badge>;
            case 'completed': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
            case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPriorityIcon = (priority: string) => {
        if (priority === 'urgent' || priority === 'stat') {
            return <AlertCircle className="h-4 w-4 text-red-500" />;
        }
        return <Clock className="h-4 w-4 text-gray-400" />;
    };

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                        <Microscope className="h-8 w-8 text-blue-600" />
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
                            <Clock className="h-4 w-4 text-yellow-500" />
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
                            <FlaskConical className="h-4 w-4 text-blue-500" />
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
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
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
                            <div className="flex items-center justify-between">
                                <CardTitle>Test Requests</CardTitle>
                                <div className="relative w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search patient or test..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
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
                                            <div className={`p-2 rounded-full ${request.priority === 'urgent' ? 'bg-red-100' : 'bg-gray-100'}`}>
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
                                                <Button size="sm" variant="secondary">
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
                            <div className="text-center py-12">
                                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium">Select a request to enter results</h3>
                                <p className="text-muted-foreground mt-2">
                                    Go to the Requests tab and click "Enter Result" on an in-progress test.
                                </p>
                            </div>
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
                                {[
                                    { name: 'Complete Blood Count (CBC)', code: 'HEM-001', category: 'Hematology', price: 150 },
                                    { name: 'Lipid Profile', code: 'BIO-001', category: 'Biochemistry', price: 200 },
                                    { name: 'Liver Function Test', code: 'BIO-002', category: 'Biochemistry', price: 250 },
                                    { name: 'Urinalysis', code: 'MIC-001', category: 'Microbiology', price: 80 },
                                    { name: 'Thyroid Panel', code: 'IMM-001', category: 'Immunology', price: 300 },
                                ].map((test, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <h4 className="font-medium">{test.name}</h4>
                                            <p className="text-xs text-muted-foreground">{test.code} • {test.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">K{test.price}</p>
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
