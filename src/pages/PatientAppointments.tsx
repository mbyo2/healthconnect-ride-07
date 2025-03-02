
import { useState } from "react";
import { Header } from "@/components/Header";
import { AppointmentsList } from "@/components/patient/AppointmentsList";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const PatientAppointments = () => {
  const navigate = useNavigate();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-20 pb-24 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h1 className="text-2xl font-bold">Your Appointments</h1>
            <Button 
              onClick={() => navigate("/search")} 
              className="flex items-center gap-2"
            >
              <CalendarPlus className="w-4 h-4" />
              Book New Appointment
            </Button>
          </div>
          
          <AppointmentsList />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default PatientAppointments;
