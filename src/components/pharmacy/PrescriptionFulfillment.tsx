import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useOfflineMode } from "@/hooks/use-offline-mode";
import { safeCryptoUUID } from "@/utils/storage";
import { Pill, AlertTriangle, CheckCircle, Package } from "lucide-react";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

interface Prescription {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency?: string;
  prescribed_by: string;
  prescribed_date: string;
  notes?: string;
  fulfillment_status?: "pending" | "filled" | "partially_filled" | "cancelled";
  patient_name?: string;
}

export function PrescriptionFulfillment() {
  const { institutionId, loading: institutionLoading } = useInstitutionContext();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isOnline, queueOfflineAction, cacheForOffline, getOfflineCache } = useOfflineMode();

  useEffect(() => {
    const loadPrescriptions = async () => {
      try {
        setLoading(true);

        if (!isOnline) {
          const cachedData = await getOfflineCache("pharmacy_prescriptions");
          if (cachedData) {
            setPrescriptions(cachedData);
            setLoading(false);
            return;
          }
        }

        let query = (supabase as any).from("comprehensive_prescriptions").select(`
          *,
          profiles:patient_id(first_name, last_name),
          provider:provider_id(first_name, last_name)
        `);

        if (institutionId) {
          query = query.or(`pharmacy_id.eq.${institutionId},pharmacy_id.is.null`);
        }

        const { data: prescriptionsData, error } = await query.order("prescribed_date", { ascending: false });
        if (error) throw error;

        const prescriptionsWithStatus = (prescriptionsData || []).map((prescription: any) => ({
          id: prescription.id,
          patient_id: prescription.patient_id,
          medication_name: prescription.medication_name,
          dosage: prescription.dosage,
          frequency: prescription.instructions,
          prescribed_by: prescription.provider
            ? `Dr. ${prescription.provider.first_name} ${prescription.provider.last_name}`
            : "Unknown Provider",
          prescribed_date: prescription.prescribed_date,
          notes: prescription.notes,
          fulfillment_status: prescription.status as "pending" | "filled" | "partially_filled" | "cancelled",
          patient_name: prescription.profiles
            ? `${prescription.profiles.first_name} ${prescription.profiles.last_name}`
            : "Unknown Patient",
        }));

        setPrescriptions(prescriptionsWithStatus);
        await cacheForOffline("pharmacy_prescriptions", prescriptionsWithStatus);
      } catch (error) {
        console.error("Error loading prescriptions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPrescriptions();
  }, [institutionId, institutionLoading, isOnline, cacheForOffline, getOfflineCache]);

  const updateFulfillmentStatus = async (prescriptionId: string, newStatus: string) => {
    try {
      setPrescriptions((prev) =>
        prev.map((p) => {
          if (p.id === prescriptionId) {
            return {
              ...p,
              fulfillment_status: newStatus as any,
            };
          }
          return p;
        })
      );

      if (!isOnline) {
        await queueOfflineAction({
          id: safeCryptoUUID(),
          type: "UPDATE_PRESCRIPTION_STATUS",
          table: "comprehensive_prescriptions",
          data: { id: prescriptionId, status: newStatus },
        });
        toast({ title: "Status saved offline" });
        return;
      }

      const { error } = await (supabase as any)
        .from("comprehensive_prescriptions")
        .update({ status: newStatus })
        .eq("id", prescriptionId);
      if (error) throw error;

      toast({ title: "Prescription Status Updated" });
    } catch (error) {
      console.error("Error updating fulfillment status:", error);
    }
  };

  const getStatusPill = (st: string) => {
    switch (st) {
      case "filled":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">Filled</span>;
      case "cancelled":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#e2445c]">Cancelled</span>;
      case "partially_filled":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#a25ddc]">Partially Filled</span>;
      default:
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#fdab3d]">Pending Rx</span>;
    }
  };

  if (loading || institutionLoading) {
    return <div className="p-8 text-center text-xs font-bold text-slate-400">Loading prescription queue...</div>;
  }

  return (
    <div className="space-y-4 font-sans text-slate-900 dark:text-slate-100">
      <div className="flex justify-between items-center border-b border-[#e6e9ef] pb-3">
        <h2 className="text-base font-extrabold flex items-center gap-2">
          <Pill className="h-5 w-5 text-[#0073ea]" />
          Pharmacy Prescription Fulfillment Queue
        </h2>
        {!isOnline && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Offline Mode
          </span>
        )}
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-[#e6e9ef] bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
              <th className="py-2.5 px-4">Medication Name</th>
              <th className="py-2.5 px-3">Patient</th>
              <th className="py-2.5 px-3 text-center">Fulfillment Status</th>
              <th className="py-2.5 px-3">Dosage & Instructions</th>
              <th className="py-2.5 px-3">Prescriber</th>
              <th className="py-2.5 px-3 text-center">Update Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e9ef]">
            {prescriptions.map((p) => (
              <tr key={p.id} className="hover:bg-[#f0f2f7] transition-colors">
                <td className="py-3 px-4 font-extrabold text-slate-900">{p.medication_name}</td>
                <td className="py-3 px-3 font-bold text-[#0073ea]">{p.patient_name}</td>
                <td className="py-3 px-3 text-center">{getStatusPill(p.fulfillment_status || "pending")}</td>
                <td className="py-3 px-3">
                  <div className="font-semibold">{p.dosage}</div>
                  <div className="text-[10px] text-slate-400">{p.frequency}</div>
                </td>
                <td className="py-3 px-3 text-slate-600">{p.prescribed_by}</td>
                <td className="py-3 px-3 text-center">
                  <select
                    value={p.fulfillment_status || "pending"}
                    onChange={(e) => updateFulfillmentStatus(p.id, e.target.value)}
                    className="p-1 rounded border border-[#c3c6d4] text-xs font-bold bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="partially_filled">Partially Filled</option>
                    <option value="filled">Filled</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PrescriptionFulfillment;
