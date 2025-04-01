
import React, { useEffect } from "react";
import { SearchFilters } from "@/components/SearchFilters";
import { SearchResults } from "@/components/SearchResults";
import { SearchProvider } from "@/context/SearchContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { SpeakerLoud, VolumeX } from "lucide-react";
import { useVoiceCommands } from "@/hooks/use-voice-commands";

const Search = () => {
  const { speak, isSpeaking } = useVoiceCommands();
  
  useEffect(() => {
    // Welcome announcement for screen reader users
    if (speak) {
      setTimeout(() => {
        speak("Welcome to the healthcare provider search page. You can search for providers by name, specialty, or location. Use voice commands like 'find doctor' or 'filter by specialty cardiology' to navigate.");
      }, 1000);
    }
  }, [speak]);
  
  const handleStopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-8 pt-20" id="main-content">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Find Healthcare Providers</h1>
            
            {isSpeaking && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStopSpeaking}
                className="flex items-center gap-1"
                aria-label="Stop speaking"
              >
                <VolumeX className="h-4 w-4" />
                Stop Speaking
              </Button>
            )}
          </div>
          
          <SearchProvider>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <SearchFilters />
              </div>
              <div className="lg:col-span-3">
                <SearchResults />
              </div>
            </div>
          </SearchProvider>
        </div>
      </main>
    </div>
  );
};

export default Search;
