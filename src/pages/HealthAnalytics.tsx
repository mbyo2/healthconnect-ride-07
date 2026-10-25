import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Download, Heart, Activity, Droplet, Weight, LineChart as LineChartIcon, HeartPulse } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useHealthData } from "@/hooks/useHealthData";
import { useAuth } from "@/context/AuthContext";
import { AIInsightsWidget } from "@/components/ai/AIInsightsWidget";

const HealthAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("7days");
  const [activeTab, setActiveTab] = useState<"heart-rate" | "activity" | "sleep" | "vitals">("heart-rate");
  const { heartRateData, activityData, sleepData, vitalsData, loading, hasVitals, hasMetrics } = useHealthData(user?.id, timeRange);

  const hasAnyData = hasVitals || hasMetrics;
  const latestLabel = vitalsData.recordedAt
    ? `Latest · ${new Date(vitalsData.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : null;

  const exportReport = () => {
    if (!hasAnyData) return;
    const rows: string[] = ["section,date,metric,value"];
    heartRateData.forEach((d: any) => {
      rows.push(`heart_rate,${d.date},avg_bpm,${d.avg}`);
      rows.push(`heart_rate,${d.date},min_bpm,${d.min}`);
      rows.push(`heart_rate,${d.date},max_bpm,${d.max}`);
    });
    activityData.forEach((d: any) => {
      rows.push(`activity,${d.date},steps,${d.steps}`);
      rows.push(`activity,${d.date},calories,${d.calories}`);
    });
    sleepData.forEach((d: any) => {
      rows.push(`sleep,${d.date},hours,${d.hours}`);
    });
    if (vitalsData.recordedAt) {
      rows.push(`latest_vitals,${vitalsData.recordedAt},blood_pressure,${vitalsData.bloodPressure ?? ""}`);
      rows.push(`latest_vitals,${vitalsData.recordedAt},oxygen_saturation,${vitalsData.oxygenSaturation ?? ""}`);
      rows.push(`latest_vitals,${vitalsData.recordedAt},weight,${vitalsData.weight ?? ""}`);
      rows.push(`latest_vitals,${vitalsData.recordedAt},resting_heart_rate,${vitalsData.restingHeartRate ?? ""}`);
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `health-analytics-${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-canvas dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Sticky Monday Top Header */}
      <div className="doc-page-header px-4 sm:px-6 py-4 shadow-xs">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Biometric Health Analytics
              </h1>
              <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">
                Your recorded vitals and activity trends — shown only from data you have actually logged
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 rounded-md border border-graphite-300 dark:border-slate-700 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold focus:outline-none"
              aria-label="Time range"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="1year">Last Year</option>
            </select>

            <button
              onClick={exportReport}
              disabled={!hasAnyData || loading}
              className="px-4 py-2 min-h-[44px] rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {loading ? (
          /* Loading state: skeleton cards while vitals load — never flash placeholder numbers */
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Loading vitals">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs animate-pulse">
                  <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
                  <div className="h-8 w-20 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
                  <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <div className="h-[380px] rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>
          </>
        ) : !hasAnyData ? (
          /* Empty state: nothing recorded yet — one clear next action */
          <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-10 shadow-xs text-center max-w-xl mx-auto">
            <div className="h-16 w-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto mb-4">
              <HeartPulse className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No health data yet</h2>
            <p className="text-sm text-graphite-500 dark:text-slate-400 mb-6">
              Record your first vitals — blood pressure, heart rate, weight or oxygen saturation —
              and your trends will appear here. We only show measurements you have actually logged.
            </p>
            <button
              onClick={() => navigate("/iot-monitoring")}
              className="px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm shadow-xs transition-all min-h-[44px]"
            >
              Record vitals
            </button>
          </div>
        ) : (
          <>
            {/* AI Health Insights */}
            <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <AIInsightsWidget
                context="health"
                data={{
                  heartRate: heartRateData,
                  activity: activityData,
                  sleep: sleepData,
                  timeRange,
                }}
              />
            </div>

            {/* 4 Vitals KPI Summary Strip — real recorded values only */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Blood Pressure"
                icon={<Heart className="h-5 w-5 text-error-500" />}
                value={vitalsData.bloodPressure}
                caption={latestLabel}
                accent="text-error-500"
              />
              <KpiCard
                label="Oxygen Saturation"
                icon={<Droplet className="h-5 w-5 text-primary-500" />}
                value={vitalsData.oxygenSaturation}
                caption={latestLabel}
                accent="text-primary-500"
              />
              <KpiCard
                label="Body Weight"
                icon={<Weight className="h-5 w-5 text-purple-500" />}
                value={vitalsData.weight}
                caption={latestLabel}
                accent="text-purple-500"
              />
              <KpiCard
                label="Resting Heart Rate"
                icon={<Activity className="h-5 w-5 text-warning-500" />}
                value={vitalsData.restingHeartRate}
                caption={latestLabel}
                accent="text-warning-500"
              />
            </div>

            {/* Detailed Analytics Board */}
            <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-canvas-silk dark:border-slate-800 pb-3 mb-4">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <LineChartIcon className="h-4 w-4 text-primary-500" />
                  Biometric Data Visualizations
                </h2>
                <div className="flex items-center gap-1 p-1 rounded-lg bg-canvas border border-canvas-silk dark:border-slate-800" role="tablist" aria-label="Biometric data views">
                  {[
                    { id: "heart-rate", label: "Heart Rate" },
                    { id: "activity", label: "Activity" },
                    { id: "sleep", label: "Sleep" },
                    { id: "vitals", label: "Vitals Grid" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        activeTab === tab.id
                          ? "bg-primary-500 text-white shadow-xs"
                          : "text-graphite-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "heart-rate" && (
                heartRateData.length === 0 ? (
                  <ChartEmptyState message="No heart rate readings in this period. Record vitals to see your trend." />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-xs text-graphite-500 dark:text-slate-400 uppercase">Heart Rate (bpm) — from your recorded vitals</h3>
                    </div>
                    <div className="h-[380px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={heartRateData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                          <XAxis dataKey="date" fontSize={11} />
                          <YAxis fontSize={11} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="avg" stroke="#0073ea" strokeWidth={3} name="Average" />
                          <Line type="monotone" dataKey="min" stroke="#00c875" strokeWidth={2} name="Min" />
                          <Line type="monotone" dataKey="max" stroke="#e2445c" strokeWidth={2} name="Max" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )
              )}

              {activeTab === "activity" && (
                activityData.length === 0 ? (
                  <ChartEmptyState message="No activity data in this period. Sync a device or log activity to see your trend." />
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-xs text-graphite-500 dark:text-slate-400 uppercase">Daily Step Count & Active Caloric Burn</h3>
                    <div className="h-[380px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activityData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                          <XAxis dataKey="date" fontSize={11} />
                          <YAxis fontSize={11} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="steps" fill="#0073ea" name="Steps" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="calories" fill="#00c875" name="Calories" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )
              )}

              {activeTab === "sleep" && (
                sleepData.length === 0 ? (
                  <ChartEmptyState message="No sleep logged in this period. Log your sleep hours to see your trend." />
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-xs text-graphite-500 dark:text-slate-400 uppercase">Sleep Duration (recorded hours per night)</h3>
                    <div className="h-[380px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sleepData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                          <XAxis dataKey="date" fontSize={11} />
                          <YAxis fontSize={11} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="hours" fill="#a25ddc" name="Sleep hours" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )
              )}

              {activeTab === "vitals" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <VitalsTile title="Blood Pressure" value={vitalsData.bloodPressure} accent="text-error-500" caption={latestLabel} />
                  <VitalsTile title="Oxygen Saturation (SpO2)" value={vitalsData.oxygenSaturation} accent="text-primary-500" caption={latestLabel} />
                  <VitalsTile title="Body Weight" value={vitalsData.weight} accent="text-purple-500" caption={latestLabel} />
                  <VitalsTile title="Resting Heart Rate" value={vitalsData.restingHeartRate} accent="text-warning-500" caption={latestLabel} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function KpiCard({ label, icon, value, caption, accent }: {
  label: string;
  icon: React.ReactNode;
  value: string | null;
  caption: string | null;
  accent: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-graphite-500 dark:text-slate-400 uppercase">{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-bold font-mono ${value ? accent : "text-slate-400 dark:text-slate-500"}`}>
        {value ?? "—"}
      </div>
      <div className="text-xs text-graphite-500 dark:text-slate-400 font-bold mt-0.5">
        {value ? caption ?? "Recorded reading" : "No readings yet"}
      </div>
    </div>
  );
}

function VitalsTile({ title, value, accent, caption }: {
  title: string;
  value: string | null;
  accent: string;
  caption: string | null;
}) {
  return (
    <div className="p-4 rounded-xl border border-canvas-silk bg-canvas dark:bg-slate-950">
      <p className="font-semibold text-xs text-graphite-500 dark:text-slate-400 uppercase">{title}</p>
      <p className={`text-3xl font-bold font-mono mt-2 ${value ? accent : "text-slate-400 dark:text-slate-500"}`}>
        {value ?? "—"}
      </p>
      <p className="text-xs text-graphite-500 dark:text-slate-400 font-bold mt-1">
        {value ? caption ?? "Recorded reading" : "No readings yet"}
      </p>
    </div>
  );
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="h-[280px] flex flex-col items-center justify-center text-center gap-2">
      <Activity className="h-8 w-8 text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-bold text-graphite-500 dark:text-slate-400 max-w-xs">{message}</p>
    </div>
  );
}

export default HealthAnalytics;
