
import { useState } from "react";
import { SymptomCollector } from "@/components/SymptomCollector";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Index = () => {
  const navigate = useNavigate();
  
  const handleSymptomSubmit = (symptoms: string, urgency: string) => {
    console.log("Symptoms submitted:", { symptoms, urgency });
    toast.success("Symptoms recorded successfully");
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-10 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Your Health Portal</h1>
        <p className="text-muted-foreground mt-2">Track symptoms, find healthcare providers, and manage appointments all in one place</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-card rounded-lg shadow-sm p-6 border">
          <h2 className="text-xl font-semibold mb-4">Report Symptoms</h2>
          <SymptomCollector onSymptomSubmit={handleSymptomSubmit} />
        </div>
        
        <div className="bg-card rounded-lg shadow-sm p-6 border space-y-6">
          <h2 className="text-xl font-semibold mb-2">Quick Actions</h2>
          
          <div className="grid grid-cols-1 gap-4">
            <Button 
              onClick={() => navigate('/search')}
              className="justify-between"
              variant="outline"
            >
              Find Healthcare Providers
              <ArrowRight size={16} />
            </Button>
            
            <Button 
              onClick={() => navigate('/appointments')}
              className="justify-between"
              variant="outline"
            >
              Manage Appointments
              <ArrowRight size={16} />
            </Button>
            
            <Button 
              onClick={() => navigate('/map')}
              className="justify-between"
              variant="outline"
            >
              View Nearby Facilities
              <ArrowRight size={16} />
            </Button>
            
            <Button 
              onClick={() => navigate('/profile')}
              className="justify-between"
              variant="outline"
            >
              Update Profile
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
