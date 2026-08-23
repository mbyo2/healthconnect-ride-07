import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Calendar, Users, Star, TrendingUp, Clock, XCircle, CheckCircle, BarChart3, MessageSquareText } from "lucide-react";

export const ProviderAnalyticsDashboard = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["my-provider-stats"],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("provider_statistics" as any)
        .select("*")
        .eq("provider_id", user.id)
        .single();
      return data as any;
    },
    enabled: !!user,
  });

  const { data: recentAppointments = [] } = useQuery({
    queryKey: ["provider-recent-appointments"],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("appointments")
        .select(`*, patient:profiles!appointments_patient_id_fkey (first_name, last_name)`)
        .eq("provider_id", user.id)
        .order("date", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: recentReviews = [] } = useQuery({
    queryKey: ["provider-recent-reviews"],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("provider_reviews" as any)
        .select(`*, patient:profiles!provider_reviews_patient_id_fkey (first_name, last_name)`)
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  const completionRate = stats?.total_appointments > 0
    ? ((stats.completed_appointments / stats.total_appointments) * 100).toFixed(1)
    : "0";

  const noShowRate = stats?.total_appointments > 0
    ? ((stats.no_show_count / stats.total_appointments) * 100).toFixed(1)
    : "0";

  const statCards = [
    { label: "Total Appointments", value: stats?.total_appointments || 0, icon: Calendar, color: "text-[#0073ea]" },
    { label: "Completed Visits", value: stats?.completed_appointments || 0, icon: CheckCircle, color: "text-[#00c875]" },
    { label: "Cancelled", value: stats?.cancelled_appointments || 0, icon: XCircle, color: "text-[#e2445c]" },
    { label: "Total Patients", value: stats?.total_patients || 0, icon: Users, color: "text-[#a25ddc]" },
    { label: "Avg Rating", value: stats?.average_rating?.toFixed(1) || "—", icon: Star, color: "text-[#fdab3d]" },
    { label: "Total Reviews", value: stats?.total_reviews || 0, icon: BarChart3, color: "text-[#0073ea]" },
    { label: "Completion Rate", value: `${completionRate}%`, icon: TrendingUp, color: "text-[#00c875]" },
    { label: "No-Show Rate", value: `${noShowRate}%`, icon: Clock, color: "text-[#fdab3d]" },
  ];

  return (
    <div className="space-y-6 font-sans">
      <div className="border-b border-[#e6e9ef] pb-3">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#0073ea]" /> Practice Analytics & Patient Engagement Telemetry
        </h2>
        <p className="text-xs text-[#676879] font-medium">Track clinical throughput, patient satisfaction ratings, and appointment adherence metrics</p>
      </div>

      {/* 8 Bento Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-3.5 rounded-xl border border-[#e6e9ef] bg-white shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#f5f6f8] border border-[#e6e9ef]">
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="text-xl font-black font-mono text-slate-900">{value}</p>
                <p className="text-[10px] font-extrabold text-[#676879] uppercase">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Appointments */}
        <div className="rounded-2xl border border-[#e6e9ef] bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#e6e9ef] pb-2">
            <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[#0073ea]" /> Recent Patient Visits
            </h3>
            <span className="text-[10px] font-bold text-[#676879]">{recentAppointments.length} visits</span>
          </div>

          {recentAppointments.length === 0 ? (
            <p className="text-[#676879] text-xs font-medium py-6 text-center">No recent appointments recorded</p>
          ) : (
            <div className="space-y-2 text-xs">
              {recentAppointments.map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between p-2.5 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8]">
                  <div>
                    <p className="font-extrabold text-slate-900">{apt.patient?.first_name} {apt.patient?.last_name}</p>
                    <p className="text-[10px] text-[#676879] font-medium">{apt.date} at {apt.time}</p>
                  </div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
                    apt.status === "completed" ? "bg-[#00c875]" : apt.status === "cancelled" ? "bg-[#e2445c]" : "bg-[#0073ea]"
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reviews & Patient Satisfaction */}
        <div className="rounded-2xl border border-[#e6e9ef] bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#e6e9ef] pb-2">
            <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
              <MessageSquareText className="h-4 w-4 text-[#fdab3d]" /> Patient Ratings & Feedback
            </h3>
            <span className="text-[10px] font-bold text-[#676879]">Avg: {stats?.average_rating?.toFixed(1) || "5.0"} ★</span>
          </div>

          {recentReviews.length === 0 ? (
            <p className="text-[#676879] text-xs font-medium py-6 text-center">No patient feedback submitted yet</p>
          ) : (
            <div className="space-y-2 text-xs">
              {(recentReviews as any[]).map((review) => (
                <div key={review.id} className="p-3 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "text-[#fdab3d] fill-[#fdab3d]" : "text-slate-300"}`} />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-[#676879]">{review.patient?.first_name}</span>
                  </div>
                  {review.review_text && <p className="text-xs text-slate-700 font-medium mt-1.5 leading-relaxed">{review.review_text}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
