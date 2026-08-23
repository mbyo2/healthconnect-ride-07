import React, { useEffect, useState } from "react";
import { Video, Calendar, Users, Phone, Clock, Radio } from "lucide-react";
import { safeCryptoUUID } from "@/utils/storage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const VideoDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ upcoming: 0, today: 0, active: 0, loading: true });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const now = new Date();
        const today = now.toISOString().split("T")[0];
        const tomorrow = new Date(now.getTime() + 86_400_000).toISOString().split("T")[0];
        const sevenDays = new Date(now.getTime() + 7 * 86_400_000).toISOString().split("T")[0];

        const [upcomingRes, todayRes, activeRes] = await Promise.all([
          (supabase as any)
            .from("video_consultations")
            .select("id", { count: "exact", head: true })
            .or(`patient_id.eq.${user.id},provider_id.eq.${user.id}`)
            .gte("scheduled_at", now.toISOString())
            .lte("scheduled_at", `${sevenDays}T23:59:59`),
          (supabase as any)
            .from("video_consultations")
            .select("id", { count: "exact", head: true })
            .or(`patient_id.eq.${user.id},provider_id.eq.${user.id}`)
            .gte("scheduled_at", `${today}T00:00:00`)
            .lt("scheduled_at", `${tomorrow}T00:00:00`),
          (supabase as any)
            .from("video_consultations")
            .select("id", { count: "exact", head: true })
            .or(`patient_id.eq.${user.id},provider_id.eq.${user.id}`)
            .in("status", ["in_progress", "live"]),
        ]);

        setStats({
          upcoming: upcomingRes.count ?? 0,
          today: todayRes.count ?? 0,
          active: activeRes.count ?? 0,
          loading: false,
        });
      } catch (err) {
        console.error("VideoDashboard load error:", err);
        setStats((s) => ({ ...s, loading: false }));
      }
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Sticky Monday Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm shadow-xs">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                Telehealth & Video Telemetry Board
                <span className="w-2 h-2 rounded-full bg-[#00c875] animate-ping" />
              </h1>
              <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                HD Encrypted WebRTC Video Rooms, Patient Waiting Rooms, and E-Prescriptions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/video-call/${safeCryptoUUID()}`)}
              className="px-4 py-2 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5"
            >
              <Phone className="h-4 w-4" />
              <span>Instant Call Room</span>
            </button>
            <button
              onClick={() => navigate("/appointments")}
              className="px-4 py-2 rounded-md border border-[#c3c6d4] bg-white text-slate-800 font-bold text-xs hover:bg-[#f0f2f7] flex items-center gap-1.5"
            >
              <Calendar className="h-4 w-4 text-[#676879]" />
              <span>Schedule Call</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-[#676879] uppercase">Upcoming Sessions (7d)</span>
              <Video className="h-5 w-5 text-[#0073ea]" />
            </div>
            <div className="text-3xl font-black font-mono text-[#0073ea]">{stats.loading ? "—" : stats.upcoming}</div>
            <div className="text-[10px] text-[#676879] font-bold mt-0.5">
              {stats.upcoming === 0 ? "No sessions scheduled" : `${stats.upcoming} sessions scheduled`}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-[#676879] uppercase">Today's Appointments</span>
              <Clock className="h-5 w-5 text-[#fdab3d]" />
            </div>
            <div className="text-3xl font-black font-mono text-[#fdab3d]">{stats.loading ? "—" : stats.today}</div>
            <div className="text-[10px] text-[#676879] font-bold mt-0.5">
              {stats.today === 0 ? "No sessions scheduled today" : `${stats.today} consultation(s) today`}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-[#676879] uppercase">Active Live Calls</span>
              <Radio className="h-5 w-5 text-[#00c875] animate-pulse" />
            </div>
            <div className="text-3xl font-black font-mono text-[#00c875]">{stats.loading ? "—" : stats.active}</div>
            <div className="text-[10px] text-[#676879] font-bold mt-0.5">
              {stats.active === 0 ? "No active consultations" : `${stats.active} session(s) live`}
            </div>
          </div>
        </div>

        {/* Quick Launch Card */}
        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#0073ea] text-white">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Launch On-Demand Telehealth Room</h3>
              <p className="text-xs text-[#676879] font-medium">Create an instant encrypted WebRTC room link and invite patients or providers.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => navigate(`/video-call/${safeCryptoUUID()}`)}
              className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <Phone className="h-4 w-4" /> Start Instant Call
            </button>
            <button
              onClick={() => navigate("/appointments")}
              className="w-full md:w-auto px-5 py-2.5 rounded-xl border border-[#c3c6d4] bg-white text-slate-800 font-bold text-xs hover:bg-[#f0f2f7] flex items-center justify-center gap-2"
            >
              <Calendar className="h-4 w-4 text-[#676879]" /> Schedule Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDashboard;
