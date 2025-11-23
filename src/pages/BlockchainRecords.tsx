import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Share2, Eye, Download, FileText, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useMedicalRecords } from "@/hooks/useMedicalRecords";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BlockchainRecords = () => {
    const { user } = useAuth();
    const { records: medicalRecords, loading, addRecord, shareRecord } = useMedicalRecords(user?.id);
    const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newRecord, setNewRecord] = useState({
        title: '',
        provider: '',
        date: new Date().toISOString().split('T')[0],
        category: 'Checkup'
    });

    const handleAddRecord = async () => {
        await addRecord({
            ...newRecord,
            shared_with: [] // Initialize shared_with as empty array
        });
        setIsAddDialogOpen(false);
        setNewRecord({
            title: '',
            provider: '',
            date: new Date().toISOString().split('T')[0],
            category: 'Checkup'
        });
    };

    const auditTrail = [
        { action: 'Record Created', user: 'Dr. Sarah Johnson', timestamp: '2025-11-15 10:30 AM', verified: true },
        { action: 'Record Accessed', user: 'You', timestamp: '2025-11-16 2:15 PM', verified: true },
        { action: 'Shared with Provider', user: 'You', timestamp: '2025-11-17 9:00 AM', verified: true },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/20 to-background p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
                            <Shield className="w-10 h-10 text-purple-600" />
                            Blockchain Medical Records
                        </h1>
                        <p className="text-muted-foreground mt-1">Secure, immutable, and verifiable health records</p>
                    </div>
                    <div className="flex gap-3">
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Record
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Medical Record</DialogTitle>
                                    <DialogDescription>
                                        This record will be encrypted and stored on the blockchain.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="title" className="text-right">Title</Label>
                                        <Input
                                            id="title"
                                            value={newRecord.title}
                                            onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="provider" className="text-right">Provider</Label>
                                        <Input
                                            id="provider"
                                            value={newRecord.provider}
                                            onChange={(e) => setNewRecord({ ...newRecord, provider: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="date" className="text-right">Date</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={newRecord.date}
                                            onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="category" className="text-right">Category</Label>
                                        <Select
                                            value={newRecord.category}
                                            onValueChange={(val) => setNewRecord({ ...newRecord, category: val })}
                                        >
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Checkup">Checkup</SelectItem>
                                                <SelectItem value="Lab Results">Lab Results</SelectItem>
                                                <SelectItem value="Prescription">Prescription</SelectItem>
                                                <SelectItem value="Surgery">Surgery</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleAddRecord}>Save to Blockchain</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Export All
                        </Button>
                    </div>
                </div>

                {/* Security Info Banner */}
                <Card className="border-purple-200 bg-purple-50/50">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-purple-100">
                                <Lock className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">End-to-End Encryption</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    All your medical records are encrypted and stored on a secure blockchain. Only you and authorized healthcare providers can access them.
                                </p>
                                <div className="flex gap-4 mt-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <span>256-bit Encryption</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <span>Immutable Records</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <span>Full Audit Trail</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Records List */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Your Medical Records</CardTitle>
                            <CardDescription>Blockchain-verified health documents</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {loading ? (
                                <div className="text-center py-4">Loading records...</div>
                            ) : medicalRecords.length > 0 ? (
                                medicalRecords.map((record) => (
                                    <div
                                        key={record.id}
                                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${selectedRecord === record.id ? 'border-purple-500 bg-purple-50/50' : ''
                                            }`}
                                        onClick={() => setSelectedRecord(record.id)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <FileText className="w-5 h-5 text-purple-600" />
                                                    <h4 className="font-semibold">{record.title}</h4>
                                                    {record.verified && (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Verified
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">Provider: {record.provider}</p>
                                                <p className="text-sm text-muted-foreground">Date: {record.date}</p>
                                                <p className="text-xs text-muted-foreground mt-2 font-mono truncate">
                                                    Hash: {record.hash}
                                                </p>
                                                {record.shared_with && record.shared_with.length > 0 && (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <Share2 className="w-3 h-3 text-blue-600" />
                                                        <span className="text-xs text-blue-600">Shared with: {record.shared_with.join(', ')}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <Badge>{record.category}</Badge>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No records found. Add your first medical record.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Audit Trail */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Eye className="w-5 h-5" />
                                Audit Trail
                            </CardTitle>
                            <CardDescription>Complete access history</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {auditTrail.map((entry, index) => (
                                <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-0">
                                    <div className={`p-2 rounded-full ${entry.verified ? 'bg-green-50' : 'bg-yellow-50'}`}>
                                        {entry.verified ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{entry.action}</p>
                                        <p className="text-xs text-muted-foreground">by {entry.user}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{entry.timestamp}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Record Details */}
                {selectedRecord && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Record Details & Verification</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="details">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="details">Details</TabsTrigger>
                                    <TabsTrigger value="blockchain">Blockchain Info</TabsTrigger>
                                    <TabsTrigger value="sharing">Sharing</TabsTrigger>
                                </TabsList>
                                <TabsContent value="details" className="space-y-4 mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        View full record details, download PDF, or request modifications from your healthcare provider.
                                    </p>
                                    <div className="flex gap-3">
                                        <Button>View Full Record</Button>
                                        <Button variant="outline">Download PDF</Button>
                                    </div>
                                </TabsContent>
                                <TabsContent value="blockchain" className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Blockchain Verification</p>
                                        <p className="text-xs text-muted-foreground font-mono bg-muted p-3 rounded">
                                            {medicalRecords.find(r => r.id === selectedRecord)?.hash}
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-green-600">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Verified on blockchain</span>
                                        </div>
                                    </div>
                                </TabsContent>
                                <TabsContent value="sharing" className="space-y-4 mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Manage who can access this record. All sharing is logged and can be revoked at any time.
                                    </p>
                                    <Button>
                                        <Share2 className="w-4 h-4 mr-2" />
                                        Share with Provider
                                    </Button>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default BlockchainRecords;
