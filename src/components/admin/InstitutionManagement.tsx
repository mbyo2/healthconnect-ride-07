import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/context/UserRolesContext";
import { toast } from "sonner";
import { Building2, ShieldAlert, UserCog, Search, Ban, CheckCircle2 } from "lucide-react";

interface InstitutionRow {
  id: string;
  name: string;
  type: string;
  city: string | null;
  is_verified: boolean | null;
  status: string | null;
  admin_id: string | null;
  created_at: string | null;
  admin_email?: string | null;
  admin_name?: string | null;
}

/**
 * Platform-superadmin-only institution oversight.
 *
 * Hierarchy: the app superadmin has MORE control than any institution
 * superadmin — they can suspend/unsuspend any institution and transfer
 * any institution's superadmin. Institution superadmins are confined to
 * their own institution and cannot perform these actions.
 */
export const InstitutionManagement = () => {
  const { isSuperAdmin } = useUserRoles();
  const [institutions, setInstitutions] = useState<InstitutionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferEmail, setTransferEmail] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("healthcare_institutions")
        .select("id, name, type, city, is_verified, status, admin_id, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      // Resolve superadmin identities.
      const adminIds = [...new Set((data || []).map((r: any) => r.admin_id).filter(Boolean))];
      let adminMap = new Map<string, { email: string; name: string }>();
      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .in("id", adminIds);
        for (const p of (profiles as any[]) || []) {
          adminMap.set(p.id, {
            email: p.email,
            name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email,
          });
        }
      }

      setInstitutions(
        ((data as any[]) || []).map((r) => ({
          ...r,
          admin_email: r.admin_id ? adminMap.get(r.admin_id)?.email || null : null,
          admin_name: r.admin_id ? adminMap.get(r.admin_id)?.name || r.admin_id : "—",
        }))
      );
    } catch (e: any) {
      toast.error("Failed to load institutions: " + (e.message || "unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) fetchInstitutions();
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center text-graphite-500">
        <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Only the platform superadmin can manage institutions.</p>
      </div>
    );
  }

  const setSuspended = async (inst: InstitutionRow, suspended: boolean) => {
    setProcessing(inst.id);
    try {
      const { error } = await (supabase as any).rpc("set_institution_suspended", {
        p_institution_id: inst.id,
        p_suspended: suspended,
      });
      if (error) throw error;
      toast.success(`Institution ${suspended ? "suspended" : "unsuspended"}`);
      fetchInstitutions();
    } catch (e: any) {
      toast.error("Failed: " + (e.message || "unknown error"));
    } finally {
      setProcessing(null);
    }
  };

  const transferSuperadmin = async (inst: InstitutionRow) => {
    const email = transferEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Enter the new superadmin's email address.");
      return;
    }
    setProcessing(inst.id);
    try {
      // Resolve the user by email.
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", email)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile) throw new Error("No user found with that email.");

      const { error } = await (supabase as any).rpc("transfer_institution_superadmin", {
        p_institution_id: inst.id,
        p_new_admin_id: (profile as any).id,
      });
      if (error) throw error;
      toast.success(`Superadmin transferred to ${email}`);
      setTransferTarget(null);
      setTransferEmail("");
      fetchInstitutions();
    } catch (e: any) {
      toast.error("Transfer failed: " + (e.message || "unknown error"));
    } finally {
      setProcessing(null);
    }
  };

  const filtered = institutions.filter((i) => {
    const t = search.toLowerCase();
    return (
      !t ||
      i.name.toLowerCase().includes(t) ||
      (i.admin_name || "").toLowerCase().includes(t) ||
      (i.admin_email || "").toLowerCase().includes(t) ||
      (i.city || "").toLowerCase().includes(t)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" /> All Institutions
          </h2>
          <p className="text-sm text-graphite-500">
            Platform oversight — suspend institutions or transfer their superadmin.
            Institution superadmins cannot perform these actions.
          </p>
        </div>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-graphite-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, superadmin, city…"
            className="vf-input pl-9 w-64"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-graphite-500 py-8 text-center">Loading institutions…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-canvas-silk">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-canvas-silk/50 text-left">
                <th className="px-4 py-2.5 font-medium">Institution</th>
                <th className="px-4 py-2.5 font-medium">Superadmin</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inst) => {
                const suspended = inst.status === "suspended";
                return (
                  <tr key={inst.id} className="border-t border-canvas-silk">
                    <td className="px-4 py-3">
                      <div className="font-medium">{inst.name}</div>
                      <div className="text-xs text-graphite-500 capitalize">
                        {inst.type?.replace(/_/g, " ")} {inst.city ? `· ${inst.city}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div className="font-medium">{inst.admin_name}</div>
                        <div className="text-graphite-500">{inst.admin_email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-pill text-xs font-medium ${
                          suspended
                            ? "bg-danger-50 text-danger-500 border border-danger-100"
                            : inst.is_verified
                            ? "bg-success-50 text-success-500 border border-success-100"
                            : "bg-warning-50 text-warning-500 border border-warning-100"
                        }`}
                      >
                        {suspended ? "Suspended" : inst.is_verified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSuspended(inst, !suspended)}
                          disabled={processing === inst.id}
                          className="vf-btn-secondary gap-1.5 text-xs"
                          title={suspended ? "Unsuspend institution" : "Suspend institution"}
                        >
                          {suspended ? (
                            <><CheckCircle2 className="h-3.5 w-3.5" /> Unsuspend</>
                          ) : (
                            <><Ban className="h-3.5 w-3.5" /> Suspend</>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setTransferTarget(transferTarget === inst.id ? null : inst.id);
                            setTransferEmail("");
                          }}
                          className="vf-btn-secondary gap-1.5 text-xs"
                          title="Transfer superadmin to another user"
                        >
                          <UserCog className="h-3.5 w-3.5" /> Transfer
                        </button>
                      </div>
                      {transferTarget === inst.id && (
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <input
                            value={transferEmail}
                            onChange={(e) => setTransferEmail(e.target.value)}
                            placeholder="new.superadmin@email.com"
                            className="vf-input text-xs w-56"
                            type="email"
                          />
                          <button
                            onClick={() => transferSuperadmin(inst)}
                            disabled={processing === inst.id}
                            className="vf-btn-primary text-xs"
                          >
                            Confirm
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-sm text-graphite-500 py-8 text-center">No institutions match.</p>
          )}
        </div>
      )}
    </div>
  );
};
