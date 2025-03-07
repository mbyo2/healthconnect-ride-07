import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LoadingScreen } from "@/components/LoadingScreen";

const AdminDashboard = () => {
  const [personnelApplications, setPersonnelApplications] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);

  // Function to fetch admin applications
  const fetchAdminApplications = async () => {
    setIsLoading(true);
    try {
      // Fetch healthcare personnel applications
      const { data: personnelApplications, error: personnelError } = await supabase
        .from('health_personnel_applications')
        .select(`
          id, 
          user_id,
          license_number,
          specialty,
          years_of_experience,
          status,
          documents_url,
          created_at,
          review_notes,
          profiles:user_id(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (personnelError) throw personnelError;

      setPersonnelApplications(personnelApplications || []);

      // Fetch institution applications
      const { data: institutions, error: institutionsError } = await supabase
        .from('healthcare_institutions')
        .select('*')
        .eq('is_verified', false)
        .order('created_at', { ascending: false });

      if (institutionsError) throw institutionsError;

      setInstitutions(institutions || []);
    } catch (error: any) {
      console.error("Error fetching admin applications:", error);
      toast.error(`Error: ${error.message || "Failed to fetch applications"}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminApplications();
  }, []);

  const handleApplicationStatusChange = async (applicationId: string, newStatus: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('health_personnel_applications')
        .update({ status: newStatus, review_notes: reviewNotes })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success('Application status updated successfully!');
      fetchAdminApplications(); // Refresh data
    } catch (error: any) {
      console.error("Error updating application status:", error);
      toast.error(`Error: ${error.message || "Failed to update status"}`);
    } finally {
      setIsLoading(false);
      setSelectedApplicationId(null);
      setReviewNotes('');
    }
  };

  const handleInstitutionVerification = async (institutionId: string, isVerified: boolean) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('healthcare_institutions')
        .update({ is_verified: isVerified })
        .eq('id', institutionId);

      if (error) throw error;

      toast.success('Institution verification status updated successfully!');
      fetchAdminApplications(); // Refresh data
    } catch (error: any) {
      console.error("Error updating institution verification status:", error);
      toast.error(`Error: ${error.message || "Failed to update verification status"}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Healthcare Personnel Applications</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>A list of healthcare personnel applications.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Applicant</TableHead>
                <TableHead>License Number</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Years of Experience</TableHead>
                <TableHead>Submitted Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personnelApplications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell className="font-medium">{application.profiles?.first_name} {application.profiles?.last_name}</TableCell>
                  <TableCell>{application.license_number}</TableCell>
                  <TableCell>{application.specialty}</TableCell>
                  <TableCell>{application.years_of_experience}</TableCell>
                  <TableCell>{format(new Date(application.created_at), 'PPP')}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        application.status === 'pending'
                          ? 'secondary'
                          : application.status === 'approved'
                            ? 'success'
                            : 'destructive'
                      }
                    >
                      {application.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <DotsHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => {
                          setSelectedApplicationId(application.id);
                          setReviewNotes(application.review_notes || '');
                        }}>
                          Update Status
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <a href={application.documents_url} target="_blank" rel="noopener noreferrer">
                            View Documents
                          </a>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Healthcare Institution Applications</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>A list of healthcare institutions awaiting verification.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Submitted Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {institutions.map((institution) => (
                <TableRow key={institution.id}>
                  <TableCell className="font-medium">{institution.name}</TableCell>
                  <TableCell>{institution.email}</TableCell>
                  <TableCell>{institution.type}</TableCell>
                  <TableCell>{format(new Date(institution.created_at), 'PPP')}</TableCell>
                  <TableCell>
                    <Badge variant={institution.is_verified ? 'success' : 'secondary'}>
                      {institution.is_verified ? 'Verified' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInstitutionVerification(institution.id, !institution.is_verified)}
                    >
                      {institution.is_verified ? 'Unverify' : 'Verify'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Dialog for updating application status */}
      <Dialog open={selectedApplicationId !== null} onOpenChange={() => setSelectedApplicationId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Application Status</DialogTitle>
            <DialogDescription>
              Choose a new status for the application and add any review notes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select onValueChange={(value) => handleApplicationStatusChange(selectedApplicationId!, value)} defaultValue="pending">
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reviewNotes" className="text-right">
                Review Notes
              </Label>
              <Textarea
                id="reviewNotes"
                className="col-span-3"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default () => (
  <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
    <AdminDashboard />
  </ProtectedRoute>
);
