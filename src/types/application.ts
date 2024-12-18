import { Database } from "@/integrations/supabase/types";

type ApplicationRow = Database["public"]["Tables"]["health_personnel_applications"]["Row"];

export interface Application extends ApplicationRow {
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}