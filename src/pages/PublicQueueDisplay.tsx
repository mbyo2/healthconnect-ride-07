import React, { useState, useEffect } from "react";
import { Tv, Volume2, Clock, CheckCircle2, Building2, Bell, Sparkles } from "lucide-react";

interface DisplayToken {
  tokenNumber: string;
  department: string;
  room: string;
  doctor: string;
  status: "Called" | "In-Room" | "Next";
}

const LIVE_DISPLAY_TOKENS: DisplayToken[] = [
  { tokenNumber: "PED-04", department: "Pediatric Clinic", room: "Room 104", doctor: "Dr. Lindiwe Zulu", status: "Called" },
  { tokenNumber: "OPD-101", department: "General Medicine", room: "Room 102", doctor: "Dr. Mwape Chilufya", status: "In-Room" },
  { tokenNumber: "PHM-28", department: "Main Pharmacy", room: "Counter 2", doctor: "Pharm. Kelvin Tembo", status: "Next" },
  { tokenNumber: "LAB-12", department: "Phlebotomy / Lab", room: "Sample Station 1", doctor: "Lab Scientist Banda", status: "In-Room" },
  { tokenNumber: "PT-02", department: "Physiotherapy", room: "Rehab Gym B", doctor: "PT Faith Musonda", status: "In-Room" },
  { tokenNumber: "RAD-08", department: "Radiology X-Ray", room: "Imaging Suite 1", doctor: "Rad. Tech Phiri", status: "Next" },
];

export const PublicQueueDisplay: React.FC = () => {
  const [tokens, setTokens] = useState<DisplayToken[]>(LIVE_DISPLAY_TOKENS);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentlyCalled = tokens.find((t) => t.status === "Called") || tokens[0];

  return (
    <div className="min-h-screen bg-[#070d17] text-white font-sans p-6 sm:p-10 flex flex-col justify-between select-none">
      {/* Top TV Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-[#0073ea] flex items-center justify-center font-black text-2xl shadow-lg shadow-[#0073ea]/30">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              DOC' O CLOCK HEALTHCARE NETWORK
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            </h1>
            <p className="text-sm font-medium text-slate-400">
              Live Patient Calling &amp; Department Queue Display System
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-3xl font-black font-mono text-emerald-400 tracking-wider">
            {currentTime}
          </div>
          <div className="text-xs font-semibold text-slate-400 mt-0.5">
            {currentDate}
          </div>
        </div>
      </div>

      {/* Main Focus: Big Screen Now Calling Hero */}
      <div className="my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left 7 cols: Current Active Called Token */}
        <div className="lg:col-span-7 p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#162033] to-[#0073ea]/40 border-2 border-[#0073ea] shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Bell className="h-48 w-48 text-[#0073ea]" />
          </div>

          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0073ea] text-white text-xs font-black uppercase tracking-widest animate-pulse">
              <Volume2 className="h-4 w-4" /> Now Calling / Token Called
            </div>

            <div className="mt-8">
              <div className="text-7xl sm:text-9xl font-black font-mono tracking-tight text-white drop-shadow-md">
                {currentlyCalled.tokenNumber}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700/80 grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-bold uppercase text-slate-400">Please Proceed To:</span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 mt-1">
                {currentlyCalled.room}
              </div>
              <span className="text-sm font-semibold text-slate-300">{currentlyCalled.department}</span>
            </div>

            <div>
              <span className="text-xs font-bold uppercase text-slate-400">Attending Clinician:</span>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                {currentlyCalled.doctor}
              </div>
              <span className="text-xs text-blue-300 font-bold">Consultation Active</span>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Department Status Grid */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          <div className="px-2 font-extrabold text-sm uppercase text-slate-400 tracking-wider">
            All Department Active Queues
          </div>

          <div className="space-y-3 flex-1">
            {tokens.slice(1).map((tok, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#0073ea]/20 text-[#0073ea] font-mono font-black text-sm flex items-center justify-center border border-[#0073ea]/40">
                    {tok.tokenNumber}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">{tok.department}</h4>
                    <p className="text-xs text-slate-400">{tok.room} • {tok.doctor}</p>
                  </div>
                </div>

                <div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      tok.status === "In-Room"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-blue-950 text-blue-300 border border-blue-800"
                    }`}
                  >
                    {tok.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom News Ticker / Waiting Room Advice */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px] uppercase">
            Notice
          </span>
          <span>
            Please have your Token Slip and National ID / Insurance Card ready when your number is called.
          </span>
        </div>
        <div className="text-slate-500 hidden md:block">
          Need assistance? Please visit the Central Registration Desk.
        </div>
      </div>
    </div>
  );
};

export default PublicQueueDisplay;
