
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";

interface InstitutionApplication {
    id: string;
    applicant_id: string;
    institution_name: string;
    institution_type: string;
    status: 'pending' | 'under_review' | 'approved' | 'rejected';
    submitted_at: string;
    documents_complete: boolean;
    verification_complete: boolean;
    payment_complete: boolean;
}

export const InstitutionApplications = () => {
    const [applications, setApplications] = useState<InstitutionApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchApplications = async () => {
        try {
            const { data, error } = await supabase
                .from('institution_applications')
                .select('*')
                .eq('status', 'pending')
                .order('submitted_at', { ascending: false });

            if (error) throw error;
            setApplications(data as any || []);
        } catch (error) {
            console.error("Error fetching applications:", error);
            toast.error("Failed to load applications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const handleApprove = async (app: InstitutionApplication) => {
        setProcessingId(app.id);
        try {
            // 1. Update application status
            const { error: appError } = await supabase
                .from('institution_applications')
                .update({ status: 'approved', reviewed_at: new Date().toISOString() })
                .eq('id', app.id);

            if (appError) throw appError;

            // 2. Update institution verification status
            // We need to find the institution by admin_id (which is applicant_id)
            const { error: instError } = await supabase
                .from('healthcare_institutions')
                .update({ is_verified: true })
                .eq('admin_id', app.applicant_id);

            if (instError) throw instError;

            // 3. Log audit
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('audit_logs').insert({
                    user_id: user.id,
                    action: 'approve_institution',
                    resource_type: 'institution_application',
                    resource_id: app.id,
                    details: { institution_name: app.institution_name }
                });
            }

            // 4. Send notification
            await supabase.from('notifications').insert({
                user_id: app.applicant_id,
                title: 'Institution Application Approved',
                message: `Your application for ${app.institution_name} has been approved. You can now access the institution portal.`,
                type: 'system',
                read: false
            });

            toast.success(`Approved ${app.institution_name}`);
            fetchApplications();
        } catch (error: any) {
            console.error("Error approving application:", error);
            toast.error(error.message || "Failed to approve");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (app: InstitutionApplication) => {
        setProcessingId(app.id);
        try {
            const { error } = await supabase
                .from('institution_applications')
                .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
                .eq('id', app.id);

            if (error) throw error;

            // Send notification
            await supabase.from('notifications').insert({
                user_id: app.applicant_id,
                title: 'Institution Application Rejected',
                message: `Your application for ${app.institution_name} has been rejected. Please check the status page for more details.`,
                type: 'system',
                read: false
            });

            toast.success(`Rejected ${app.institution_name}`);
            fetchApplications();
        } catch (error: any) {
            console.error("Error rejecting application:", error);
            toast.error(error.message || "Failed to reject");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Pending Applications</h2>
            {applications.length === 0 ? (
                <p className="text-muted-foreground">No pending applications.</p>
            ) : (
                <div className="grid gap-4">
                    {applications.map((app) => (
                        <Card key={app.id}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg font-medium">
                                    {app.institution_name}
                                </CardTitle>
                                <Badge variant="outline" className="capitalize">
                                    {app.institution_type}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-muted-foreground">
                                        Submitted: {new Date(app.submitted_at).toLocaleDateString()}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                            onClick={() => handleApprove(app)}
                                            disabled={!!processingId}
                                        >
                                            {processingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleReject(app)}
                                            disabled={!!processingId}
                                        >
                                            {processingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
