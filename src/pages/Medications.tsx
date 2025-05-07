
import React from "react";
import { PrescriptionTracker } from "@/components/patient/PrescriptionTracker";
import { Header } from "@/components/Header";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const Medications = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-20 pb-24">
          <h1 className="text-2xl font-bold mb-6">Medications</h1>
          <PrescriptionTracker />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Medications;
