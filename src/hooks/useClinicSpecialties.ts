import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClinicSpecialty {
  id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  is_active: boolean;
}

export interface SpecialtyStaffRole {
  id: string;
  specialty_id: string;
  role_name: string;
  description: string | null;
  requires_license: boolean;
  is_clinical: boolean;
}

export interface InstitutionSpecialty {
  id: string;
  institution_id: string;
  specialty_id: string;
  is_primary: boolean;
  specialty?: ClinicSpecialty;
}

// Fetch all available specialties from catalog
export const useClinicSpecialtyCatalog = () => {
  return useQuery({
    queryKey: ["clinic-specialty-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_specialty_catalog" as any)
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as unknown as ClinicSpecialty[];
    },
    staleTime: 1000 * 60 * 30, // 30 min — catalog rarely changes
  });
};

// Fetch staff roles for given specialty IDs
export const useSpecialtyStaffRoles = (specialtyIds: string[]) => {
  return useQuery({
    queryKey: ["specialty-staff-roles", specialtyIds],
    queryFn: async () => {
      if (!specialtyIds.length) return [];
      const { data, error } = await supabase
        .from("specialty_staff_roles" as any)
        .select("*")
        .in("specialty_id", specialtyIds)
        .order("role_name");
      if (error) throw error;
      return data as unknown as SpecialtyStaffRole[];
    },
    enabled: specialtyIds.length > 0,
  });
};

// Fetch specialties for a specific institution
export const useInstitutionSpecialties = (institutionId: string | undefined) => {
  return useQuery({
    queryKey: ["institution-specialties", institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await supabase
        .from("institution_specialties" as any)
        .select("*, clinic_specialty_catalog(*)")
        .eq("institution_id", institutionId);
      if (error) throw error;
      return (data as any[]).map((row) => ({
        id: row.id,
        institution_id: row.institution_id,
        specialty_id: row.specialty_id,
        is_primary: row.is_primary,
        specialty: row.clinic_specialty_catalog as ClinicSpecialty,
      })) as InstitutionSpecialty[];
    },
    enabled: !!institutionId,
  });
};

// Save specialties for an institution (upsert)
export const saveInstitutionSpecialties = async (
  institutionId: string,
  specialtyIds: string[],
  primarySpecialtyId?: string
) => {
  // Remove existing
  await supabase
    .from("institution_specialties" as any)
    .delete()
    .eq("institution_id", institutionId);

  if (!specialtyIds.length) return;

  const rows = specialtyIds.map((sid) => ({
    institution_id: institutionId,
    specialty_id: sid,
    is_primary: sid === primarySpecialtyId,
  }));

  const { error } = await supabase
    .from("institution_specialties" as any)
    .insert(rows);
  if (error) throw error;
};
