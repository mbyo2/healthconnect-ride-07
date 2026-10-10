import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Brain, Smile, Eye, Bone, Dumbbell, Salad,
  HeartPulse, Baby, Wind, Sparkles, Stethoscope,
} from "lucide-react";

interface Specialty {
  id: string;
  name: string;
  icon: any;
}

const SPECIALTIES: Specialty[] = [
  { id: "psychology", name: "Psychology", icon: Brain },
  { id: "dentistry", name: "Dentist", icon: Smile },
  { id: "ophthalmology", name: "Eye Care", icon: Eye },
  { id: "orthopedics", name: "Bone", icon: Bone },
  { id: "physiotherapy", name: "Physio", icon: Dumbbell },
  { id: "nutrition", name: "Nutrition", icon: Salad },
  { id: "cardiology", name: "Heart", icon: HeartPulse },
  { id: "pediatrics", name: "Child", icon: Baby },
  { id: "pulmonology", name: "Lungs", icon: Wind },
  { id: "dermatology", name: "Skin", icon: Sparkles },
  { id: "general", name: "General", icon: Stethoscope },
];

interface SpecialtyConsultPickerProps {
  onContinue?: (selected: string[]) => void;
}

/**
 * Reference-style "What do you want to consult?" — circular specialty icons.
 * Multi-select, Doc'O Clock blue theme.
 */
export const SpecialtyConsultPicker = ({ onContinue }: SpecialtyConsultPickerProps) => {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-white rounded-3xl p-6">
      <h2 className="text-xl font-bold text-gray-900">What do you want to consult?</h2>
      <p className="text-xs text-gray-500 mt-1 mb-6">You can choose more than one</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {SPECIALTIES.map((spec) => {
          const Icon = spec.icon;
          const isSelected = selected.includes(spec.id);
          return (
            <button
              key={spec.id}
              onClick={() => toggle(spec.id)}
              className="flex flex-col items-center gap-2"
            >
              <div
                className={`h-16 w-16 rounded-full flex items-center justify-center transition-colors ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                <Icon className="h-7 w-7" />
              </div>
              <span className={`text-xs font-medium ${isSelected ? "text-blue-700" : "text-gray-600"}`}>
                {spec.name}
              </span>
            </button>
          );
        })}
      </div>

      <Button
        onClick={() => onContinue?.(selected)}
        disabled={selected.length === 0}
        className="w-full rounded-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
      >
        Continue
      </Button>
    </div>
  );
};
