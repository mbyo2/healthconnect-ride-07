
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, X } from 'lucide-react';
import { useVoiceCommands, VOICE_COMMANDS } from '@/hooks/use-voice-commands';

export const VoiceCommandsHelp = () => {
  const [showHelp, setShowHelp] = React.useState(false);
  const { startListening, isListening } = useVoiceCommands();
  
  // Only show this component once per session
  React.useEffect(() => {
    const hasSeenVoiceHelp = sessionStorage.getItem('hasSeenVoiceHelp');
    if (!hasSeenVoiceHelp) {
      setShowHelp(true);
    }
  }, []);
  
  const handleDismiss = () => {
    setShowHelp(false);
    sessionStorage.setItem('hasSeenVoiceHelp', 'true');
  };
  
  const handleStartListening = () => {
    startListening();
    handleDismiss();
  };
  
  if (!showHelp || isListening) return null;
  
  return (
    <div className="fixed bottom-16 inset-x-0 z-40 p-4 flex justify-center pointer-events-none">
      <Card className="w-full max-w-md p-4 shadow-lg pointer-events-auto" role="alert" aria-live="polite">
        <div className="flex justify-between items-start">
          <h3 className="font-medium flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Voice Commands Available
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleDismiss}
            aria-label="Dismiss voice commands help"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm mt-2 text-muted-foreground">
          This app supports voice navigation. Say commands like "go home", "search", or "find doctor" to navigate.
        </p>
        <div className="mt-3 flex justify-end items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
          >
            Not now
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleStartListening}
            className="gap-1"
          >
            <Mic className="h-4 w-4" />
            Enable voice commands
          </Button>
        </div>
      </Card>
    </div>
  );
};
