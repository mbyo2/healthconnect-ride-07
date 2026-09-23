import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Tv, Volume2, Clock, CheckCircle2, Building2, Bell, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DisplayToken {
  id: string;
  tokenNumber: string;
  department: string;
  status: "waiting" | "serving" | "completed" | "cancelled" | "no_show";
}

export const PublicQueueDisplay: React.FC = () => {
  const [searchParams] = useSearchParams();
  // TV displays are per-facility: /queue-display?institution=<uuid>
  const institutionId = searchParams.get("institution") || "";
  const [tokens, setTokens] = useState<DisplayToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTokens = useCallback(async () => {
    if (!institutionId) { setLoading(false); return; }
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("queue_tokens")
        .select("id, token_number, department, status")
        .eq("institution_id", institutionId)
        .gte("created_at", today)
        .neq("status", "cancelled")
        .order("created_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      setTokens(((data as any[]) || []).map((t) => ({
        id: String(t.id),
        tokenNumber: String(t.token_number || "—"),
        department: String(t.department || "General"),
        status: t.status,
      })));
      setFeedError(false);
    } catch {
      setFeedError(true);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  useEffect(() => {
    if (!institutionId) return;
    const channel = supabase
      .channel("public-queue-display")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_tokens", filter: `institution_id=eq.${institutionId}` },
        () => fetchTokens()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [institutionId, fetchTokens]);

  // Token numbers only — never patient names on a public screen.
  const serving = tokens.filter((t) => t.status === "serving");
  const waiting = tokens.filter((t) => t.status === "waiting");
  const currentlyCalled = serving[serving.length - 1] || waiting[0] || null;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6 sm:p-10 flex flex-col justify-between select-none">
      {/* Top TV Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary-500 flex items-center justify-center font-black text-2xl shadow-lg shadow-primary-500/30">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              DOC' O CLOCK HEALTHCARE NETWORK
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            </h1>
            <p className="text-sm font-medium text-slate-400">
              {institutionId ? "Department Queue Display" : "Department Queue Display — not connected"}
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
        <div className="lg:col-span-7 p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-primary-500/40 border-2 border-primary-500 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Bell className="h-48 w-48 text-primary-500" />
          </div>

          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500 text-white text-xs font-black uppercase tracking-widest animate-pulse">
              <Volume2 className="h-4 w-4" /> Now Calling / Token Called
            </div>

            <div className="mt-8">
              {loading ? (
                <div className="text-4xl sm:text-5xl font-black tracking-tight text-slate-400" role="status" aria-label="Loading queue">
                  Loading queue…
                </div>
              ) : currentlyCalled ? (
                <div className="text-7xl sm:text-9xl font-black font-mono tracking-tight text-white drop-shadow-md">
                  {currentlyCalled.tokenNumber}
                </div>
              ) : (
                <div className="text-3xl sm:text-5xl font-black tracking-tight text-slate-300">
                  {!institutionId
                    ? "Display not connected"
                    : feedError
                      ? "Live queue unavailable"
                      : "No tokens called yet"}
                </div>
              )}
            </div>
            {!loading && !currentlyCalled && (
              <p className="mt-4 text-sm text-slate-400 max-w-md">
                {!institutionId
                  ? "Append ?institution=<facility-id> to this display's URL to connect it to a live queue."
                  : feedError
                    ? "Check the display's network connection and queue permissions, then reload."
                    : "Tokens appear here the moment reception calls them."}
              </p>
            )}
          </div>

          {currentlyCalled && (
            <div className="mt-8 pt-6 border-t border-slate-700/80 grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold uppercase text-slate-400">Department:</span>
                <div className="text-3xl sm:text-4xl font-black text-emerald-400 mt-1">
                  {currentlyCalled.department}
                </div>
                <span className="text-sm font-semibold text-slate-300">Please proceed as directed by reception</span>
              </div>

              <div>
                <span className="text-xs font-bold uppercase text-slate-400">Status:</span>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1 capitalize">
                  {currentlyCalled.status === "serving" ? "Now serving" : "Next in queue"}
                </div>
                <span className="text-xs text-blue-300 font-bold">Token numbers only — names stay private</span>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 cols: Department Status Grid */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          <div className="px-2 font-extrabold text-sm uppercase text-slate-400 tracking-wider">
            Up Next in Queue
          </div>

          <div className="space-y-3 flex-1">
            {waiting.slice(0, 6).map((tok) => (
              <div
                key={tok.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary-500/20 text-primary-500 font-mono font-black text-sm flex items-center justify-center border border-primary-500/40">
                    {tok.tokenNumber}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">{tok.department}</h4>
                    <p className="text-xs text-slate-400">Waiting</p>
                  </div>
                </div>

                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-blue-950 text-blue-300 border border-blue-800">
                    Next
                  </span>
                </div>
              </div>
            ))}
            {!loading && waiting.length === 0 && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-sm text-slate-400 text-center">
                Queue is clear — walk-ins welcome at reception.
              </div>
            )}
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
