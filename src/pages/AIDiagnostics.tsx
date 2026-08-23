import { Helmet } from "react-helmet-async";
import { MedGemmaChat as DocOClockAIChat } from "@/components/MedGemmaChat";
import { SymptomCollector } from "@/components/SymptomCollector";
import { AIDiagnosisHistory } from "@/components/AIDiagnosisHistory";
import { DocumentAnalysisUploader } from "@/components/ai/DocumentAnalysisUploader";
import { Imaging3DUploader } from "@/components/ai/Imaging3DUploader";
import { Brain, MessageSquare, ClipboardList, Shield, History, FileText, Layers, AlertCircle } from "lucide-react";
import { useState } from "react";
import { ClinicalAction } from "@/components/ai/ClinicalDecisionCard";

const AIDiagnostics = () => {
  const [activeTab, setActiveTab] = useState("chat");

  const handleActionClick = (action: ClinicalAction) => {
    if (action.route === "tab:history") {
      setActiveTab("history");
    } else if (action.route === "tab:symptoms") {
      setActiveTab("symptoms");
    }
  };

  return (
    <>
      <Helmet>
        <title>AI Diagnostic Assistant | Doc&apos; O Clock</title>
        <meta name="description" content="Get AI-powered health analysis and medical insights from Doc' O Clock AI." />
      </Helmet>

      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
        {/* Sticky Monday Top Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
          <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm shadow-xs">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                  Multimodal Medical AI Diagnostic Workspace
                  <span className="w-2 h-2 rounded-full bg-[#00c875] animate-ping" />
                </h1>
                <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                  Evidence-based clinical decision support powered by MedGemma 27B & 3D Volumetric Imaging
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#a25ddc]">
                Clinical AI Engine Active
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="max-w-[1500px] mx-auto mt-4 flex items-center gap-2">
            {[
              { id: "chat", label: "AI Consultation", icon: <MessageSquare className="h-3.5 w-3.5" /> },
              { id: "documents", label: "Document OCR", icon: <FileText className="h-3.5 w-3.5" /> },
              { id: "imaging", label: "3D DICOM Imaging", icon: <Layers className="h-3.5 w-3.5" /> },
              { id: "symptoms", label: "Symptom Collector", icon: <ClipboardList className="h-3.5 w-3.5" /> },
              { id: "history", label: "History Log", icon: <History className="h-3.5 w-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === tab.id
                    ? "bg-[#0073ea] text-white shadow-xs"
                    : "bg-white dark:bg-slate-900 border border-[#e6e9ef] text-[#676879] hover:bg-[#f0f2f7]"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
          {/* Feature Quick-Access Bento Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { id: "chat", title: "AI Assistant", sub: "Chat & image analysis", color: "#0073ea", icon: <MessageSquare className="h-5 w-5" /> },
              { id: "documents", title: "Doc OCR", sub: "Lab & Rx data extraction", color: "#00c875", icon: <FileText className="h-5 w-5" /> },
              { id: "imaging", title: "3D Volumetric", sub: "CT / MRI / PET-CT", color: "#a25ddc", icon: <Layers className="h-5 w-5" /> },
              { id: "symptoms", title: "Symptom Analysis", sub: "Guided intake collector", color: "#fdab3d", icon: <ClipboardList className="h-5 w-5" /> },
              { id: "history", title: "Consult History", sub: "Past AI audit logs", color: "#676879", icon: <History className="h-5 w-5" /> },
            ].map((card) => (
              <div
                key={card.id}
                onClick={() => setActiveTab(card.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  activeTab === card.id
                    ? "border-[#0073ea] bg-white shadow-xs"
                    : "border-[#e6e9ef] bg-white dark:bg-slate-900 hover:border-[#0073ea]"
                }`}
              >
                <div style={{ color: card.color }} className="mb-2">{card.icon}</div>
                <p className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{card.title}</p>
                <p className="text-[10px] text-[#676879] mt-0.5 font-medium">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Main Active Tab Body */}
          {activeTab === "chat" && (
            <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <DocOClockAIChat onActionClick={handleActionClick} />
            </div>
          )}

          {activeTab === "documents" && (
            <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <DocumentAnalysisUploader />
            </div>
          )}

          {activeTab === "imaging" && (
            <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <Imaging3DUploader />
            </div>
          )}

          {activeTab === "symptoms" && (
            <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
              <div className="border-b border-[#e6e9ef] pb-3">
                <h2 className="font-extrabold text-sm flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#fdab3d]" />
                  Guided Clinical Symptom Analysis
                </h2>
                <p className="text-xs text-[#676879] font-medium mt-0.5">
                  Describe symptoms, duration, and severity to generate an evidence-based clinical differential.
                </p>
              </div>
              <SymptomCollector />
            </div>
          )}

          {activeTab === "history" && (
            <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <AIDiagnosisHistory />
            </div>
          )}

          {/* Medical Disclaimer Banner */}
          <div className="rounded-2xl border border-[#fdab3d]/30 bg-[#fff9f0] p-4 flex items-start gap-3 text-xs">
            <AlertCircle className="h-5 w-5 text-[#fdab3d] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-slate-900">Clinical Decision Support Disclaimer</p>
              <p className="text-[#676879] mt-0.5 leading-relaxed font-medium">
                This AI assistant is designed for decision support and informational purposes. It does not replace professional medical judgment, diagnosis, or emergency triage. For life-threatening symptoms, dial emergency services immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIDiagnostics;
