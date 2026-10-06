import { useUserRoles } from "@/context/UserRolesContext";
import { LoadingScreen } from "@/components/LoadingScreen";

const TITLES: Record<string, string> = {
  receptionist: "Reception Desk",
  billing_staff: "Billing & Revenue",
  hr_manager: "Human Resources",
  cxo: "Executive Dashboard",
  support: "Support Desk",
  ambulance_staff: "Ambulance Dispatch",
  triage_staff: "Triage Station",
  ot_staff: "Operating Theatre",
  maintenance_manager: "Maintenance",
  inventory_manager: "Inventory Control",
};

export default function StaffDashboard() {
  const { availableRoles, loading } = useUserRoles();
  
  if (loading) return <LoadingScreen />;
  
  const userRole = (availableRoles[0] || "").toLowerCase();
  const title = TITLES[userRole] || "Staff Dashboard";
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-gray-600">Role: {userRole}</p>
      <p className="mt-4">Dashboard content coming soon.</p>
    </div>
  );
}
