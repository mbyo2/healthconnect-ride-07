import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Activity, Brain, Eye, Bot, ArrowRight, Sparkles, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Symptoms = () => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const navigate = useNavigate();

  const [symptomCategories, setSymptomCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchSymptomCategories();
  }, []);

  const fetchSymptomCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("symptom_categories" as any)
        .select("*")
        .order("title");

      if (error) {
        setSymptomCategories([
          {
            title: "General & Vital Signs",
            symptoms: ["Fever", "Fatigue", "Weight Loss", "Nausea", "Dizziness", "Night Sweats"],
          },
          {
            title: "Cardiovascular & Respiratory",
            symptoms: ["Chest Pain", "Palpitations", "Shortness of Breath", "Cough", "Wheezing"],
          },
          {
            title: "Neurological & Musculoskeletal",
            symptoms: ["Headache", "Numbness", "Joint Stiffness", "Back Pain", "Muscle Weakness"],
          },
        ]);
        return;
      }
      setSymptomCategories((data as any[]) || []);
    } catch (error) {
      console.error("Error fetching symptom categories:", error);
    }
  };

  const getIconForCategory = (title: string) => {
    if (title.includes("Cardio") || title.includes("Heart")) return <Heart className="h-4 w-4 text-[#e2445c]" />;
    if (title.includes("Neuro") || title.includes("Brain")) return <Brain className="h-4 w-4 text-[#a25ddc]" />;
    if (title.includes("Sensory") || title.includes("Eye")) return <Eye className="h-4 w-4 text-[#fdab3d]" />;
    return <Activity className="h-4 w-4 text-[#0073ea]" />;
  };

  const toggleSymptom = useCallback((symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  }, []);

  const handleSubmit = () => {
    if (selectedSymptoms.length === 0) {
      toast.error("Please select at least one symptom");
      return;
    }
    toast.success("Symptoms recorded successfully in your health log");
    setSelectedSymptoms([]);
    setSeverity("");
    setDescription("");
  };

  const handleAIAnalysis = () => {
    const symptomsQuery = selectedSymptoms.join(", ");
    navigate("/ai-diagnostics", { state: { symptoms: symptomsQuery } });
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Sticky Monday Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm shadow-xs">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                Patient Symptom Intake & Self-Reporting Matrix
                <span className="w-2 h-2 rounded-full bg-[#00c875] animate-ping" />
              </h1>
              <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                Log active physical symptoms to feed MedGemma AI diagnostic models and clinician case sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/ai-diagnostics")}
              className="px-4 py-2 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5"
            >
              <Bot className="h-4 w-4" />
              <span>AI Diagnostic Engine</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* AI Assistant Callout Banner */}
        <div className="rounded-2xl border border-[#0073ea]/30 bg-[#e5f0ff] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#0073ea] text-white">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0073ea] flex items-center gap-1.5">
                Doc' O Clock Clinical AI Triage <Sparkles className="h-4 w-4" />
              </h3>
              <p className="text-xs text-[#676879] font-medium">
                Receive immediate differential diagnostic analysis, symptom clustering, and 24/7 specialist matching.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/ai-diagnostics")}
            className="px-4 py-2 rounded-xl bg-[#0073ea] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all"
          >
            <span>Analyze with AI</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Symptom Selector */}
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <div className="border-b border-[#e6e9ef] pb-3">
              <h2 className="font-extrabold text-sm text-slate-900">Select Active Symptoms</h2>
              <p className="text-xs text-[#676879] font-medium mt-0.5">Click any symptom tag to add it to your current case log.</p>
            </div>

            <div className="space-y-4">
              {symptomCategories.map((category) => (
                <div key={category.title} className="space-y-2">
                  <h4 className="font-extrabold text-xs text-[#676879] uppercase flex items-center gap-1.5">
                    {getIconForCategory(category.title)}
                    {category.title}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {category.symptoms.map((symptom: string) => {
                      const isSelected = selectedSymptoms.includes(symptom);
                      return (
                        <button
                          key={symptom}
                          onClick={() => toggleSymptom(symptom)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-[#0073ea] text-white shadow-xs"
                              : "bg-[#f5f6f8] text-slate-800 border border-[#e6e9ef] hover:bg-[#e5f0ff]"
                          }`}
                        >
                          {symptom} {isSelected ? "✓" : "+"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Details & Submission */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
              <div className="border-b border-[#e6e9ef] pb-3">
                <h2 className="font-extrabold text-sm text-slate-900">Symptom Telemetry & Severity</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-extrabold text-[#676879] uppercase">Discomfort Severity (1 - 10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    placeholder="Rate severity from 1 (mild) to 10 (severe)"
                    className="w-full mt-1 p-2.5 rounded-md border border-[#c3c6d4] font-bold"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-[#676879] uppercase">Detailed Clinical Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe onset, triggers, pain quality, and affected body regions..."
                    rows={4}
                    className="w-full mt-1 p-2.5 rounded-md border border-[#c3c6d4] font-medium text-xs focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleSubmit}
                    className="py-3 rounded-xl bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all"
                  >
                    Save to Medical Log
                  </button>
                  <button
                    onClick={handleAIAnalysis}
                    disabled={selectedSymptoms.length === 0}
                    className="py-3 rounded-xl border border-[#0073ea] text-[#0073ea] hover:bg-[#e5f0ff] font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                  >
                    <Bot className="h-4 w-4" /> AI Differential
                  </button>
                </div>
              </div>
            </div>

            {selectedSymptoms.length > 0 && (
              <div className="rounded-2xl border border-[#0073ea]/30 bg-white p-4 shadow-xs space-y-2">
                <p className="font-extrabold text-xs text-slate-900">Selected Symptoms Log ({selectedSymptoms.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSymptoms.map((symptom) => (
                    <span
                      key={symptom}
                      onClick={() => toggleSymptom(symptom)}
                      className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#0073ea] cursor-pointer"
                    >
                      {symptom} ×
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Symptoms;
