
import React, { useState } from 'react';
import { Header } from "@/components/Header";
import { AccessibilityChecker } from "@/components/testing/AccessibilityChecker";
import { TestRunner } from "@/components/testing/TestRunner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const Testing = () => {
  const [activeTab, setActiveTab] = useState('automated');

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-20 pb-24">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Testing and Validation</h1>
            <p className="text-muted-foreground mt-1">
              Run automated tests and check accessibility compliance
            </p>
          </div>
          
          <Tabs defaultValue="automated" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="automated">Automated Tests</TabsTrigger>
              <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
            </TabsList>
            
            <TabsContent value="automated">
              <TestRunner />
            </TabsContent>
            
            <TabsContent value="accessibility">
              <AccessibilityChecker />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Testing;
