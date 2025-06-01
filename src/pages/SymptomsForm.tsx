
import { SymptomCollector } from "@/components/SymptomCollector";

const SymptomsForm = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Tell us about your symptoms</h1>
          <p className="text-muted-foreground">
            Provide details about what you're experiencing so we can help you find the right care.
          </p>
        </div>
        <SymptomCollector />
      </div>
    </div>
  );
};

export default SymptomsForm;
