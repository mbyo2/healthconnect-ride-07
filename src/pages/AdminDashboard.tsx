import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ApplicationWithProfile } from "@/types/application";

const AdminDashboard = () => {
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role === "admin") {
          setIsAdmin(true);
          fetchApplications();
        } else {
          toast.error("Unauthorized access");
        }
      }
    };

    checkAdminStatus();
  }, []);

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from("health_personnel_applications")
      .select(`
        *,
        profiles:user_id (
          first_name,
          last_name
        )
      `)
      .returns<ApplicationWithProfile[]>();

    if (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to fetch applications");
      return;
    }

    setApplications(data || []);
  };

  const handleApplicationStatus = async (
    applicationId: string,
    status: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("health_personnel_applications")
      .update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application status");
      return;
    }

    toast.success(`Application ${status}`);
    fetchApplications();
  };

  const viewDocuments = (urls: string[]) => {
    // Implementation for viewing documents
    console.log("Viewing documents:", urls);
  };

  if (!isAdmin) {
    return <div>Access denied</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Health Personnel Applications</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Specialty</TableHead>
            <TableHead>License Number</TableHead>
            <TableHead>Experience (Years)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Documents</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((app) => (
            <TableRow key={app.id}>
              <TableCell>
                {app.profiles?.first_name} {app.profiles?.last_name}
              </TableCell>
              <TableCell>{app.specialty}</TableCell>
              <TableCell>{app.license_number}</TableCell>
              <TableCell>{app.years_of_experience}</TableCell>
              <TableCell>{app.status}</TableCell>
              <TableCell>
                <Button 
                  variant="outline" 
                  onClick={() => app.documents_url && viewDocuments(app.documents_url)}
                  disabled={!app.documents_url?.length}
                >
                  View Documents
                </Button>
              </TableCell>
              <TableCell className="space-x-2">
                {app.status === "pending" && (
                  <>
                    <Button
                      variant="default"
                      onClick={() => handleApplicationStatus(app.id, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleApplicationStatus(app.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminDashboard;
