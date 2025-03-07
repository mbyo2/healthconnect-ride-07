
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Building2, User, FileText } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";

const AdminDashboard = () => {
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("providers");

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
          fetchInstitutions();
        } else {
          toast.error("Unauthorized access");
        }
      }
      setIsLoading(false);
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
          last_name,
          email
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

  const fetchInstitutions = async () => {
    const { data, error } = await supabase
      .from("healthcare_institutions")
      .select(`
        *,
        profiles:admin_id (
          first_name,
          last_name,
          email
        )
      `);

    if (error) {
      console.error("Error fetching institutions:", error);
      toast.error("Failed to fetch institutions");
      return;
    }

    setInstitutions(data || []);
  };

  const handleApplicationStatus = async (
    applicationId: string,
    status: string,
    reviewNotes: string = ""
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("health_personnel_applications")
      .update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
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

  const handleInstitutionVerification = async (
    institutionId: string,
    isVerified: boolean
  ) => {
    const { error } = await supabase
      .from("healthcare_institutions")
      .update({
        is_verified: isVerified,
        updated_at: new Date().toISOString()
      })
      .eq("id", institutionId);

    if (error) {
      console.error("Error updating institution:", error);
      toast.error("Failed to update institution verification status");
      return;
    }

    toast.success(isVerified ? "Institution verified" : "Institution verification revoked");
    fetchInstitutions();
  };

  const viewDocuments = (urls: string[]) => {
    // Implementation for viewing documents
    console.log("Viewing documents:", urls);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs 
        defaultValue="providers" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <User className="h-4 w-4" /> Healthcare Providers
          </TabsTrigger>
          <TabsTrigger value="institutions" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Healthcare Institutions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="providers">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Provider Applications</h2>
            {applications.length === 0 ? (
              <p className="text-muted-foreground">No pending provider applications.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
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
                      <TableCell>{app.profiles?.email}</TableCell>
                      <TableCell>{app.specialty}</TableCell>
                      <TableCell>{app.license_number}</TableCell>
                      <TableCell>{app.years_of_experience}</TableCell>
                      <TableCell>
                        <span className={
                          app.status === "approved" ? "text-green-500 font-medium" :
                          app.status === "pending" ? "text-amber-500 font-medium" :
                          "text-red-500 font-medium"
                        }>
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          onClick={() => app.documents_url && viewDocuments(app.documents_url)}
                          disabled={!app.documents_url?.length}
                          size="sm"
                        >
                          <FileText className="h-4 w-4 mr-1" /> View
                        </Button>
                      </TableCell>
                      <TableCell className="space-x-2">
                        {app.status === "pending" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApplicationStatus(app.id, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                const reason = prompt("Please provide a reason for rejection:");
                                if (reason) {
                                  handleApplicationStatus(app.id, "rejected", reason);
                                }
                              }}
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
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="institutions">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Healthcare Institutions</h2>
            {institutions.length === 0 ? (
              <p className="text-muted-foreground">No healthcare institutions registered.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>License Number</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {institutions.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell>{inst.name}</TableCell>
                      <TableCell className="capitalize">{inst.type}</TableCell>
                      <TableCell>{inst.email || inst.phone || "N/A"}</TableCell>
                      <TableCell>{inst.license_number || "N/A"}</TableCell>
                      <TableCell>
                        {[inst.city, inst.state, inst.country].filter(Boolean).join(", ") || "N/A"}
                      </TableCell>
                      <TableCell>
                        <span className={
                          inst.is_verified ? "text-green-500 font-medium" : "text-amber-500 font-medium"
                        }>
                          {inst.is_verified ? "Verified" : "Pending"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {inst.is_verified ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInstitutionVerification(inst.id, false)}
                          >
                            Revoke Verification
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleInstitutionVerification(inst.id, true)}
                          >
                            Verify
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
