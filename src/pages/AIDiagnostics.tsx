import { Helmet } from "react-helmet";
import { MedGemmaChat } from "@/components/MedGemmaChat";
import { SymptomCollector } from "@/components/SymptomCollector";
import { AIDiagnosisHistory } from "@/components/AIDiagnosisHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, MessageSquare, ClipboardList, Shield, History } from "lucide-react";

const AIDiagnostics = () => {
  return (
    <>
      <Helmet>
        <title>AI Diagnostic Assistant - MedGemma | Healthcare Platform</title>
        <meta name="description" content="Get AI-powered health analysis and medical insights from MedGemma, Google's medical AI assistant. Analyze symptoms, get health recommendations, and chat with our medical AI." />
        <meta name="keywords" content="AI diagnosis, medical AI, symptom checker, health analysis, MedGemma, medical assistant" />
      </Helmet>

      <div className="container mx-auto px-4 py-2 sm:py-8 max-w-7xl">
        <div className="space-y-3 sm:space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold">AI Diagnostic Assistant</h1>
                <p className="text-xs sm:text-base text-muted-foreground">
                  Powered by Doc 0 Clock - Your 24/7 Medical AI
                </p>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="flex overflow-x-auto pb-4 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 sm:pb-0 snap-x">
            <Card className="min-w-[240px] sm:min-w-0 snap-center">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  AI Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Chat & upload medical images for analysis
                </p>
              </CardContent>
            </Card>

            <Card className="min-w-[240px] sm:min-w-0 snap-center">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Symptom Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Get detailed analysis of your symptoms
                </p>
              </CardContent>
            </Card>

            <Card className="min-w-[240px] sm:min-w-0 snap-center">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  View your past AI consultations
                </p>
              </CardContent>
            </Card>

            <Card className="min-w-[240px] sm:min-w-0 snap-center">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Evidence-Based
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Based on medical research & guidelines
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3">
              <TabsTrigger value="chat" className="text-xs sm:text-sm">AI Chat</TabsTrigger>
              <TabsTrigger value="symptoms" className="text-xs sm:text-sm">Symptom Checker</TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-sm">History</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-3 sm:mt-6">
              <MedGemmaChat />
            </TabsContent>

            <TabsContent value="symptoms" className="mt-4 sm:mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Symptom Analysis</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Describe your symptoms and get an AI-powered analysis from Doc 0 Clock
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SymptomCollector />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4 sm:mt-6">
              <AIDiagnosisHistory />
            </TabsContent>
          </Tabs>

          {/* Disclaimer */}
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="pt-4 sm:pt-6">
              <h3 className="font-semibold mb-2 text-xs sm:text-sm">⚠️ Important Medical Disclaimer</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                This AI assistant is for informational and educational purposes only. It does not provide
                medical advice, diagnosis, or treatment. Always seek the advice of your physician or other
                qualified health provider with any questions you may have regarding a medical condition.
                Never disregard professional medical advice or delay in seeking it because of something you
                have read here. If you think you may have a medical emergency, call your doctor or emergency
                services immediately.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default AIDiagnostics;
