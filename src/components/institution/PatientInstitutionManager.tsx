import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { orIlikePattern } from "@/utils/postgrestFilter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, UserMinus, Building2, Search } from "lucide-react";

/**
 * Admin UI for managing patient-institution links.
 * Allows institution admins to link/unlink patients, view enrollment status.
 */
export function PatientInstitutionManager({ institutionId }: { institutionId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState("");

  // Get linked patients
  const { data: linkedPatients, isLoading } = useQuery({
    queryKey: ["institution-patients", institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_institution_links")
        .select(`
          id,
          patient_id,
          status,
          enrolled_at,
          profiles!patient_institution_links_patient_id_fkey (
            id, first_name, last_name, email, phone
          )
        `)
        .eq("institution_id", institutionId)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!institutionId,
  });

  // Search for patients to link
  const { data: searchResults } = useQuery({
    queryKey: ["patient-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 3) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .or(`first_name.ilike.${orIlikePattern(searchTerm)},last_name.ilike.${orIlikePattern(searchTerm)},email.ilike.${orIlikePattern(searchTerm)}`)
        .limit(10);
      return (data as any[]) || [];
    },
    enabled: searchTerm.length >= 3,
  });

  // Link patient mutation
  const linkPatient = useMutation({
    mutationFn: async (patientId: string) => {
      const { error } = await supabase
        .from("patient_institution_links")
        .insert({
          patient_id: patientId,
          institution_id: institutionId,
          status: "active",
          enrolled_by: user?.id,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institution-patients", institutionId] });
      toast.success("Patient linked to institution");
      setSearchTerm("");
      setSelectedPatient("");
    },
    onError: (err: any) => {
      toast.error("Failed to link patient: " + err.message);
    },
  });

  // Unlink patient mutation
  const unlinkPatient = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from("patient_institution_links")
        .delete()
        .eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institution-patients", institutionId] });
      toast.success("Patient unlinked");
    },
    onError: (err: any) => {
      toast.error("Failed to unlink: " + err.message);
    },
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ linkId, status }: { linkId: string; status: string }) => {
      const { error } = await supabase
        .from("patient_institution_links")
        .update({ status } as any)
        .eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institution-patients", institutionId] });
      toast.success("Status updated");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Patient-Institution Links
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and link new patient */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {searchResults && searchResults.length > 0 && (
            <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
              {searchResults.map((p: any) => {
                const isLinked = linkedPatients?.some((lp: any) => lp.patient_id === p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-2">
                    <div>
                      <div className="font-medium">{p.first_name} {p.last_name}</div>
                      <div className="text-sm text-muted-foreground">{p.email}</div>
                    </div>
                    <Button
                      size="sm"
                      disabled={isLinked || linkPatient.isPending}
                      onClick={() => linkPatient.mutate(p.id)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      {isLinked ? "Linked" : "Link"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Linked patients list */}
        <div className="space-y-2">
          <h3 className="font-medium">Linked Patients ({linkedPatients?.length || 0})</h3>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : linkedPatients?.length === 0 ? (
            <div className="text-sm text-muted-foreground border rounded-lg p-4 text-center">
              No patients linked yet. Search above to link patients.
            </div>
          ) : (
            <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
              {linkedPatients?.map((link: any) => (
                <div key={link.id} className="flex items-center justify-between p-3">
                  <div>
                    <div className="font-medium">
                      {link.profiles?.first_name} {link.profiles?.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {link.profiles?.email} • Enrolled {new Date(link.enrolled_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={link.status}
                      onValueChange={(v) => updateStatus.mutate({ linkId: link.id, status: v })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="discharged">Discharged</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Unlink this patient from the institution?")) {
                          unlinkPatient.mutate(link.id);
                        }
                      }}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
