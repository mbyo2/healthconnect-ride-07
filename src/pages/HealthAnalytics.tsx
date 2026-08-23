import { useState } from "react";
import { BarChart3, Download, Heart, Activity, Droplet, Weight, LineChart as LineChartIcon } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useHealthData } from "@/hooks/useHealthData";
import { useAuth } from "@/context/AuthContext";
import { AIInsightsWidget } from "@/components/ai/AIInsightsWidget";

const HealthAnalytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("7days");
  const [activeTab, setActiveTab] = useState<"heart-rate" | "activity" | "sleep" | "vitals">("heart-rate");
  const { heartRateData, activityData, sleepData, vitalsData } = useHealthData(user?.id, timeRange);

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Sticky Monday Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm shadow-xs">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                Biometric Health Analytics & Telemetry
                <span className="w-2 h-2 rounded-full bg-[#00c875] animate-ping" />
              </h1>
              <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                Longitudinal trends, wearable integration streams, and AI biometric analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 rounded-md border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold focus:outline-none"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="1year">Last Year</option>
            </select>

            <button className="px-4 py-2 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5">
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* AI Health Insights */}
        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
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

        {/* 4 Vitals KPI Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-[#676879] uppercase">Blood Pressure</span>
              <Heart className="h-5 w-5 text-[#e2445c]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#e2445c]">{vitalsData.bloodPressure}</div>
            <div className="text-[10px] text-[#00c875] font-bold mt-0.5">↓ 2% from last week • Normal</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-[#676879] uppercase">Oxygen Saturation</span>
              <Droplet className="h-5 w-5 text-[#0073ea]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#0073ea]">{vitalsData.oxygenSaturation}</div>
            <div className="text-[10px] text-[#00c875] font-bold mt-0.5">SpO2 • Excellent stability</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-[#676879] uppercase">Body Weight</span>
              <Weight className="h-5 w-5 text-[#a25ddc]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#a25ddc]">{vitalsData.weight}</div>
            <div className="text-[10px] text-[#00c875] font-bold mt-0.5">BMI: 22.5 • ↓ 0.5 kg this month</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-[#676879] uppercase">Resting Heart Rate</span>
              <Activity className="h-5 w-5 text-[#fdab3d]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#fdab3d]">{vitalsData.restingHeartRate}</div>
            <div className="text-[10px] text-[#00c875] font-bold mt-0.5">↓ 3 bpm • Excellent fitness</div>
          </div>
        </div>

        {/* Detailed Analytics Board */}
        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#e6e9ef] dark:border-slate-800 pb-3 mb-4">
            <h2 className="font-extrabold text-sm flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-[#0073ea]" />
              Biometric Data Visualizations
            </h2>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#f5f6f8] border border-[#e6e9ef]">
              {[
                { id: "heart-rate", label: "Heart Rate" },
                { id: "activity", label: "Activity" },
                { id: "sleep", label: "Sleep" },
                { id: "vitals", label: "Vitals Grid" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1 rounded-md text-xs font-extrabold transition-all ${
                    activeTab === tab.id
                      ? "bg-[#0073ea] text-white shadow-xs"
                      : "text-[#676879] hover:bg-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "heart-rate" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs text-[#676879] uppercase">Heart Rate Telemetry Stream (bpm)</h3>
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
          )}

          {activeTab === "activity" && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-xs text-[#676879] uppercase">Daily Step Count & Active Caloric Burn</h3>
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
          )}

          {activeTab === "sleep" && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-xs text-[#676879] uppercase">Sleep Architecture Breakdown</h3>
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sleepData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="deep" stackId="1" stroke="#a25ddc" fill="#a25ddc" name="Deep Sleep" />
                    <Area type="monotone" dataKey="light" stackId="1" stroke="#0073ea" fill="#0073ea" name="Light Sleep" />
                    <Area type="monotone" dataKey="rem" stackId="1" stroke="#00c875" fill="#00c875" name="REM Sleep" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === "vitals" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8]">
                <p className="font-extrabold text-xs text-[#676879] uppercase">Blood Pressure Telemetry</p>
                <p className="text-3xl font-black font-mono text-[#e2445c] mt-2">{vitalsData.bloodPressure}</p>
                <p className="text-xs text-[#00c875] font-bold mt-1">Normal Systolic & Diastolic balance</p>
              </div>

              <div className="p-4 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8]">
                <p className="font-extrabold text-xs text-[#676879] uppercase">Oxygen Saturation (SpO2)</p>
                <p className="text-3xl font-black font-mono text-[#0073ea] mt-2">{vitalsData.oxygenSaturation}</p>
                <p className="text-xs text-[#00c875] font-bold mt-1">Optimal arterial oxygenation</p>
              </div>

              <div className="p-4 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8]">
                <p className="font-extrabold text-xs text-[#676879] uppercase">Body Mass Index (BMI)</p>
                <p className="text-3xl font-black font-mono text-[#a25ddc] mt-2">{vitalsData.weight}</p>
                <p className="text-xs text-[#00c875] font-bold mt-1">BMI 22.5 • Healthy range</p>
              </div>

              <div className="p-4 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8]">
                <p className="font-extrabold text-xs text-[#676879] uppercase">Resting Cardiac Rate</p>
                <p className="text-3xl font-black font-mono text-[#fdab3d] mt-2">{vitalsData.restingHeartRate}</p>
                <p className="text-xs text-[#00c875] font-bold mt-1">Athletic baseline</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthAnalytics;
