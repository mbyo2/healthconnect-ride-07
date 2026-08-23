import React, { useState } from "react";
import {
  Activity, Smartphone, Watch, Heart, Thermometer, Droplet, Zap, Settings, TrendingUp, AlertCircle, CheckCircle2, Bot, Bluetooth, Usb, Cable, Wifi, Cpu
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useIoT } from "@/hooks/useIoT";
import { useAuth } from "@/context/AuthContext";
import { AIInsightsWidget } from "@/components/ai/AIInsightsWidget";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const IoTMonitoring = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { devices, vitalSigns, alerts, scanAndConnectDevice, isScanning } = useIoT(user?.id);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "smartwatch": return Watch;
      case "fitness_tracker": return Activity;
      case "blood_pressure_monitor": return Heart;
      case "thermometer": return Thermometer;
      default: return Smartphone;
    }
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case "bluetooth": return Bluetooth;
      case "usb": return Usb;
      case "serial": return Cable;
      case "wifi": return Wifi;
      default: return Zap;
    }
  };

  const { data: heartRateData } = useQuery({
    queryKey: ["heart-rate-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vital_signs")
        .select("heart_rate, recorded_at")
        .eq("user_id", user?.id)
        .order("recorded_at", { ascending: true })
        .limit(24);

      if (!data) return [];
      return data.map((record) => ({
        time: new Date(record.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        value: record.heart_rate,
      }));
    },
    enabled: !!user,
    initialData: [],
  });

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Sticky Monday Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm shadow-xs">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                IoT Medical Device & Telemetry Board
                <span className="w-2 h-2 rounded-full bg-[#00c875] animate-ping" />
              </h1>
              <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                Live stream monitoring for wearables, Bluetooth monitors, and continuous vital telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-3.5 py-2 rounded-md border border-[#c3c6d4] dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs flex items-center gap-1.5 hover:bg-[#f5f6f8]">
              <Settings className="w-4 h-4 text-[#676879]" />
              <span>Device Settings</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  disabled={isScanning}
                  className="px-4 py-2 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5"
                >
                  {isScanning ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                      <span>Scanning Devices...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Connect Device</span>
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border border-[#e6e9ef] bg-white rounded-xl shadow-lg">
                <DropdownMenuItem onClick={() => scanAndConnectDevice("bluetooth")} className="text-xs font-bold">
                  <Bluetooth className="w-4 h-4 mr-2 text-[#0073ea]" /> Bluetooth Low Energy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => scanAndConnectDevice("usb")} className="text-xs font-bold">
                  <Usb className="w-4 h-4 mr-2 text-[#00c875]" /> USB Direct Cable
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => scanAndConnectDevice("serial")} className="text-xs font-bold">
                  <Cable className="w-4 h-4 mr-2 text-[#fdab3d]" /> Serial Port
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => scanAndConnectDevice("wifi")} className="text-xs font-bold">
                  <Wifi className="w-4 h-4 mr-2 text-[#a25ddc]" /> Wi-Fi / Cloud Stream
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Connected Devices Grid */}
        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <h2 className="font-extrabold text-sm mb-4 flex items-center gap-2">
            <Watch className="h-4 w-4 text-[#0073ea]" />
            Active Connected Devices ({devices.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {devices.map((device) => {
              const Icon = getDeviceIcon(device.device_type);
              return (
                <div
                  key={device.id}
                  onClick={() => setSelectedDevice(device.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedDevice === device.id
                      ? "border-[#0073ea] bg-[#e5f0ff]/50 shadow-xs"
                      : "border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 hover:border-[#0073ea]"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-2">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] text-[#0073ea]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] text-[#676879]">
                        {React.createElement(getConnectionIcon(device.connection_type), { className: "w-4 h-4" })}
                      </div>
                    </div>
                    {device.is_active ? (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#00c875]">Connected</span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#676879]">Offline</span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{device.device_name}</h3>
                  <p className="text-[11px] text-[#676879] capitalize mb-3 font-medium">{device.device_type.replace("_", " ")}</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-[#676879]">
                      <span>Battery Level</span>
                      <span className="text-slate-900">{device.battery_level}%</span>
                    </div>
                    <Progress value={device.battery_level || 0} className="h-1.5 bg-[#e6e9ef]" />
                    <p className="text-[10px] text-[#676879] pt-1">
                      Last sync: {device.last_sync ? new Date(device.last_sync).toLocaleTimeString() : "Never"}
                    </p>
                  </div>
                </div>
              );
            })}
            {devices.length === 0 && (
              <div className="col-span-full text-center py-8 text-xs text-[#676879] font-medium">
                No active IoT devices connected. Click "Connect Device" above to initiate pairing.
              </div>
            )}
          </div>
        </div>

        {/* Current Vital Signs Bento Grid */}
        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <h2 className="font-extrabold text-sm mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#e2445c]" />
            Real-Time Vital Telemetry
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8] dark:bg-slate-950">
              <div className="flex items-center justify-between mb-2">
                <Heart className="w-5 h-5 text-[#e2445c]" />
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#00c875]">Normal</span>
              </div>
              <p className="text-[10px] font-extrabold text-[#676879] uppercase">Heart Rate</p>
              <p className="text-3xl font-black font-mono text-[#e2445c] mt-1">{vitalSigns?.heart_rate || "--"}</p>
              <p className="text-[10px] text-[#676879] font-medium">bpm</p>
            </div>

            <div className="p-4 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8] dark:bg-slate-950">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-5 h-5 text-[#0073ea]" />
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#00c875]">Normal</span>
              </div>
              <p className="text-[10px] font-extrabold text-[#676879] uppercase">Blood Pressure</p>
              <p className="text-3xl font-black font-mono text-[#0073ea] mt-1">
                {vitalSigns?.blood_pressure
                  ? `${vitalSigns.blood_pressure.systolic}/${vitalSigns.blood_pressure.diastolic}`
                  : "--/--"}
              </p>
              <p className="text-[10px] text-[#676879] font-medium">mmHg</p>
            </div>

            <div className="p-4 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8] dark:bg-slate-950">
              <div className="flex items-center justify-between mb-2">
                <Thermometer className="w-5 h-5 text-[#fdab3d]" />
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#00c875]">Normal</span>
              </div>
              <p className="text-[10px] font-extrabold text-[#676879] uppercase">Body Temperature</p>
              <p className="text-3xl font-black font-mono text-[#fdab3d] mt-1">{vitalSigns?.temperature || "--"}</p>
              <p className="text-[10px] text-[#676879] font-medium">°C</p>
            </div>

            <div className="p-4 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8] dark:bg-slate-950">
              <div className="flex items-center justify-between mb-2">
                <Droplet className="w-5 h-5 text-[#a25ddc]" />
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#00c875]">Normal</span>
              </div>
              <p className="text-[10px] font-extrabold text-[#676879] uppercase">Oxygen Saturation</p>
              <p className="text-3xl font-black font-mono text-[#a25ddc] mt-1">{vitalSigns?.oxygen_saturation || "--"}</p>
              <p className="text-[10px] text-[#676879] font-medium">% SpO2</p>
            </div>
          </div>
        </div>

        {/* Charts & Alerts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <h2 className="font-extrabold text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0073ea]" />
              24-Hour Continuous Heart Rate Telemetry
            </h2>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={heartRateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                  <XAxis dataKey="time" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#0073ea" strokeWidth={3} dot={{ r: 3, fill: "#0073ea" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <h2 className="font-extrabold text-sm mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#fdab3d]" />
              Device Alerts ({alerts.length})
            </h2>

            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8] text-xs">
                  <div className={`p-1.5 rounded-full text-white ${alert.severity === "high" ? "bg-[#e2445c]" : alert.severity === "medium" ? "bg-[#fdab3d]" : "bg-[#0073ea]"}`}>
                    {alert.severity === "low" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{alert.message}</p>
                    <p className="text-[10px] text-[#676879] mt-0.5">{new Date(alert.triggered_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-center text-xs text-[#676879] py-8">
                  No active telemetry alerts recorded.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Insights Section */}
        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <AIInsightsWidget
            context="iot"
            data={{
              devices: devices.length,
              vitalSigns,
              alertCount: alerts.length,
            }}
          />
        </div>

        {/* Connect Device Banner */}
        <div className="rounded-2xl border border-[#0073ea]/30 bg-[#e5f0ff] p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#0073ea] text-white">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0073ea]">Pair Additional Medical Devices</h3>
              <p className="text-xs text-[#676879] font-medium">Stream continuous EKG, pulse oximetry, and blood glucose directly to your medical team.</p>
            </div>
          </div>
          <button onClick={() => navigate("/ai-diagnostics")} className="px-4 py-2 rounded-xl bg-[#0073ea] text-white text-xs font-extrabold flex items-center gap-1 shadow-xs">
            <Bot className="w-4 h-4" /> AI Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};

export default IoTMonitoring;
