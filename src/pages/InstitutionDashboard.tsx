import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Settings, ExternalLink, Users, Calendar, UserRound, TrendingUp, RefreshCw } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { QuickActions } from "@/components/institution/QuickActions";
import { RecentActivityFeed } from "@/components/institution/RecentActivityFeed";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export const InstitutionDashboard = () => {
  const navigate = useNavigate();
  const { institution, loading: instLoading, isAdmin } = useInstitutionContext();
  const [counts, setCounts] = useState({ personnel: 0, appointments: 0, patients: 0, todayAppointments: 0, revenue: 0, bedOccupancy: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!institution) { setDataLoading(false); return; }

    const fetchDashboardData = async () => {
      try {
        const instId = institution.id;
        const today = format(new Date(), "yyyy-MM-dd");

        const [personnelRes, staffRes] = await Promise.all([
          supabase.from("institution_personnel").select("user_id", { count: "exact" }).eq("institution_id", instId),
          supabase.from("institution_staff").select("provider_id").eq("institution_id", instId).eq("is_active", true),
        ]);

        const personnelCount = personnelRes.count || 0;
        const providerIds = [
          ...(personnelRes.data?.map((p) => p.user_id) || []),
          ...(staffRes.data?.map((s) => s.provider_id) || []),
        ].filter((v, i, a) => a.indexOf(v) === i);

        let appointmentsCount = 0, todayCount = 0, appointmentActivities: any[] = [];
        if (providerIds.length > 0) {
          const { count } = await supabase.from("appointments").select("*", { count: "exact", head: true }).in("provider_id", providerIds);
          appointmentsCount = count || 0;
          const { count: todayC } = await supabase.from("appointments").select("*", { count: "exact", head: true }).in("provider_id", providerIds).eq("date", today);
          todayCount = todayC || 0;
          const { data: recentAppts } = await supabase.from("appointments")
            .select("id, date, time, status, type, patient:profiles!patient_id(first_name, last_name)")
            .in("provider_id", providerIds).order("created_at", { ascending: false }).limit(10);
          appointmentActivities = (recentAppts || []).map((a: any) => ({
            id: a.id, type: "appointment" as const,
            title: `${a.patient?.first_name || ""} ${a.patient?.last_name || ""}`.trim() || "Patient",
            description: `${a.type?.replace(/_/g, " ")} - ${a.status}`,
            timestamp: `${a.date}T${a.time}`,
          }));
        }

        let uniquePatients = 0;
        if (providerIds.length > 0) {
          const { data: patientAppts } = await supabase.from("appointments").select("patient_id").in("provider_id", providerIds);
          uniquePatients = new Set((patientAppts || []).map((a: any) => a.patient_id)).size;
        }

        const months: { name: string; revenue: number; appointments: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(new Date(), i);
          const mStart = format(startOfMonth(d), "yyyy-MM-dd");
          const mEnd = format(endOfMonth(d), "yyyy-MM-dd");
          const mName = format(d, "MMM");
          let mCount = 0;
          if (providerIds.length > 0) {
            const { count: mc } = await supabase.from("appointments").select("*", { count: "exact", head: true }).in("provider_id", providerIds).gte("date", mStart).lte("date", mEnd);
            mCount = mc || 0;
          }
          months.push({ name: mName, revenue: mCount * 150, appointments: mCount });
        }
        setChartData(months);
        setActivities(appointmentActivities);
        setCounts({ personnel: personnelCount || providerIds.length, appointments: appointmentsCount, patients: uniquePatients, todayAppointments: todayCount, revenue: months.reduce((s, m) => s + m.revenue, 0), bedOccupancy: 0 });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [institution]);

  if (instLoading || dataLoading) return <LoadingScreen />;

  if (!institution) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] text-center space-y-3">
          <Building2 className="h-12 w-12 mx-auto text-[#0073ea]" />
          <h2 className="text-xl font-extrabold">Institution Not Found</h2>
          <p className="text-xs text-[#676879]">Register your institution to access the dashboard.</p>
          <button onClick={() => navigate("/institution-portal")} className="px-4 py-2 rounded-md bg-[#0073ea] text-white text-xs font-bold">
            Go to Institution Portal
          </button>
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: "Staff & Personnel", value: counts.personnel, sub: "Active members", color: "#0073ea", icon: <Users className="h-5 w-5" /> },
    { label: "Total Appointments", value: counts.appointments, sub: `${counts.todayAppointments} today`, color: "#a25ddc", icon: <Calendar className="h-5 w-5" /> },
    { label: "Unique Patients", value: counts.patients, sub: "All time", color: "#00c875", icon: <UserRound className="h-5 w-5" /> },
    { label: "Est. Revenue (6mo)", value: `${institution.currency || "ZMW"} ${(counts.revenue / 1000).toFixed(1)}k`, sub: "Appointment-based", color: "#fdab3d", icon: <TrendingUp className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Monday Sticky Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold flex items-center gap-2">
                {institution.name}
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${institution.is_verified ? "bg-[#00c875]" : "bg-[#fdab3d]"}`}>
                  {institution.is_verified ? "Verified" : "Pending Verification"}
                </span>
              </h1>
              <p className="text-xs text-[#676879] capitalize font-medium">{institution.type} Dashboard • Command Centre</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/hospital-management")} className="px-3 py-1.5 rounded-md bg-[#f0f2f7] font-bold text-xs flex items-center gap-1">
              <ExternalLink className="h-3.5 w-3.5" /> Full HMS
            </button>
            {isAdmin && (
              <button onClick={() => navigate("/institution/settings")} className="px-3 py-1.5 rounded-md bg-[#f0f2f7] font-bold text-xs flex items-center gap-1">
                <Settings className="h-3.5 w-3.5" /> Settings
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <div key={card.label} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">{card.label}</span>
                <span style={{ color: card.color }}>{card.icon}</span>
              </div>
              <div className="text-2xl font-black font-mono" style={{ color: card.color }}>{card.value}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <QuickActions />
        </div>

        {/* Charts + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <h3 className="font-extrabold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#0073ea]" /> Revenue Trend (6 Months)
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [`${institution.currency || "ZMW"} ${value.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="#0073ea" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <RecentActivityFeed activities={activities} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionDashboard;
