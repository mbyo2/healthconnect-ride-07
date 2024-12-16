import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type Application = Database['public']['Tables']['health_personnel_applications']['Row'] & {
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
    fetchApplications();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !profile || profile.role !== "admin") {
      navigate("/");
      toast.error("Unauthorized access");
      return;
    }

    setUserRole(profile.role);
  };

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from("health_personnel_applications")
      .select(`
        *,
        profiles:profiles(first_name, last_name)
      `);

    if (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } else {
      setApplications(data as Application[]);
    }
    setLoading(false);
  };

  const handleStatusUpdate = async (applicationId: string, newStatus: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("health_personnel_applications")
      .update({ 
        status: newStatus,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      } as Database['public']['Tables']['health_personnel_applications']['Update'])
      .eq("id", applicationId);

    if (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application status");
    } else {
      toast.success("Application status updated successfully");
      fetchApplications();
    }
  };

  const viewDocuments = (urls: string[]) => {
    urls.forEach(url => {
      supabase.storage
        .from("medical_documents")
        .createSignedUrl(url, 3600)
        .then(({ data, error }) => {
          if (error) {
            console.error("Error creating signed URL:", error);
            toast.error("Failed to access document");
          } else if (data?.signedUrl) {
            window.open(data.signedUrl, "_blank");
          }
        });
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Health Personnel Applications</h1>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Specialty</TableHead>
            <TableHead>License</TableHead>
            <TableHead>Experience</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Documents</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((app) => (
            <TableRow key={app.id}>
              <TableCell>
                {app.profile?.first_name} {app.profile?.last_name}
              </TableCell>
              <TableCell>{app.specialty}</TableCell>
              <TableCell>{app.license_number}</TableCell>
              <TableCell>{app.years_of_experience} years</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-sm ${
                  app.status === "approved" 
                    ? "bg-green-100 text-green-800"
                    : app.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {app.status}
                </span>
              </TableCell>
              <TableCell>
                <Button 
                  variant="outline" 
                  onClick={() => viewDocuments(app.documents_url)}
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
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => handleStatusUpdate(app.id, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleStatusUpdate(app.id, "rejected")}
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
}
};
