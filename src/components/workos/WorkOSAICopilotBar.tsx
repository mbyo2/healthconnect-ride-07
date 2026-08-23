import React, { useState } from "react";
import { Sparkles, Send, Bot, Zap, CheckCircle2, ShieldAlert, Cpu, ArrowRight } from "lucide-react";

interface WorkOSAICopilotBarProps {
  isDarkMode: boolean;
  onExecutePrompt: (promptText: string) => void;
}

export const WorkOSAICopilotBar: React.FC<WorkOSAICopilotBarProps> = ({ isDarkMode, onExecutePrompt }) => {
  const [customPrompt, setCustomPrompt] = useState("");
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const PRESET_WORKFLOWS = [
    { title: "Auto-Triage Code Red", prompt: "Identify all patients with vital scores < 92% and re-prioritize to Urgent !!!", icon: ShieldAlert },
    { title: "Optimize ICU Bed Allocations", prompt: "Analyze ward capacity and suggest 3 room transfers for stabilized ICU patients.", icon: Zap },
    { title: "Check Drug Interaction Warnings", prompt: "Cross-reference all active pharmacy prescriptions for polypharmacy risks.", icon: Cpu },
    { title: "Predict 24h Admissions", prompt: "Run predictive analytics on Lusaka emergency arrival trends for tonight.", icon: Sparkles },
  ];

  const handleRun = (promptText: string) => {
    setIsAnalyzing(true);
    setAiOutput(null);
    onExecutePrompt(promptText);

    setTimeout(() => {
      setIsAnalyzing(false);
      setAiOutput(
        `AI WorkOS Telemetry Execution Complete:\n• Prompt: "${promptText}"\n• Action: Re-indexed 12 patient records across 4 group sections.\n• Recommendation: Reallocated 2 beds in Ward 4B for Dr. Mutale's cardiac admissions.\n• Risk Score: Low (Confidence 98.4%).`
      );
    }, 1200);
  };

  return (
    <div className={`p-4 sm:p-6 space-y-6 transition-colors ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-[#f5f6f8] text-slate-900"}`}>
      <div className={`p-5 sm:p-6 rounded-2xl border ${
        isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-sm"
      }`}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              Doc' O Clock Monday AI Assistant
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-bold border border-purple-500/20">
                MedGemma Neural Agent
              </span>
            </h2>
            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Automate board actions, analyze triage bottleneck telemetry, and run clinical predictions
            </p>
          </div>
        </div>

        {/* Preset Workflow Buttons */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_WORKFLOWS.map((wf) => {
            const Icon = wf.icon;
            return (
              <button
                key={wf.title}
                onClick={() => handleRun(wf.prompt)}
                className={`p-3.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between group ${
                  isDarkMode
                    ? "bg-slate-950/60 border-slate-800 hover:border-purple-500/50 hover:bg-slate-900"
                    : "bg-slate-50 border-slate-200 hover:border-purple-300 hover:bg-purple-50/50"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
                    <Icon className="h-4 w-4" />
                    <span>{wf.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {wf.prompt}
                  </p>
                </div>
                <div className="mt-3 flex items-center text-[10px] font-bold text-purple-500 group-hover:translate-x-1 transition-transform">
                  <span>Run Automation</span>
                  <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Prompt Input Box */}
        <div className="mt-5 relative">
          <input
            type="text"
            placeholder="Ask Monday AI to filter, summarize, or re-assign board items..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && customPrompt && handleRun(customPrompt)}
            className={`w-full pl-4 pr-12 py-3 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
              isDarkMode
                ? "bg-slate-950/80 border-slate-800 text-slate-100 placeholder-slate-500"
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
            }`}
          />
          <button
            onClick={() => customPrompt && handleRun(customPrompt)}
            disabled={isAnalyzing}
            className="absolute right-2 top-2 p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-all disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* AI Processing Status & Result */}
        {isAnalyzing && (
          <div className="mt-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center gap-3 text-xs font-semibold animate-pulse">
            <Sparkles className="h-5 w-5 animate-spin" />
            <span>Analyzing board telemetry and processing MedGemma neural inference...</span>
          </div>
        )}

        {aiOutput && !isAnalyzing && (
          <div className={`mt-4 p-4 rounded-xl border font-mono text-xs whitespace-pre-line leading-relaxed ${
            isDarkMode ? "bg-slate-950 border-purple-500/30 text-purple-200" : "bg-purple-50 border-purple-200 text-purple-900"
          }`}>
            <div className="flex items-center gap-2 font-bold mb-1 text-purple-600 dark:text-purple-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>AI Command Output</span>
            </div>
            {aiOutput}
          </div>
        )}
      </div>
    </div>
  );
};
