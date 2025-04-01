
import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useVoiceCommands, VOICE_COMMANDS } from '@/hooks/use-voice-commands';
import { useTheme } from '@/hooks/use-theme';
import { useAccessibility } from '@/context/AccessibilityContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const VoiceCommandButton = () => {
  const { theme, setTheme } = useTheme();
  const { isListening, isSpeaking, startListening, stopListening, speak } = useVoiceCommands({
    setTheme,
    theme,
  });
  const { isSpeaking: isAccessibilitySpeaking, stopSpeaking } = useAccessibility();
  const [showCommandList, setShowCommandList] = React.useState<boolean>(false);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleStopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (stopSpeaking) {
      stopSpeaking();
    }
  };

  // Format commands for display in tooltip and dialog
  const commandGroups = React.useMemo(() => {
    return Object.entries(VOICE_COMMANDS).reduce((acc, [command, description]) => {
      const category = command.includes('filter') || command.includes('search') || command.includes('find') ? 
        'Search' : command.includes('page') || command.includes('home') ? 
        'Navigation' : command.includes('theme') || command.includes('mode') ? 
        'Appearance' : command.includes('read') || command.includes('help') ? 
        'Accessibility' : 'General';
      
      if (!acc[category]) {
        acc[category] = [];
      }
      
      acc[category].push({ command, description });
      return acc;
    }, {} as Record<string, {command: string, description: string}[]>);
  }, []);

  const speakCommands = () => {
    if (speak) {
      const commandList = Object.entries(VOICE_COMMANDS)
        .slice(0, 10) // Just read the first 10 commands to avoid overwhelming
        .map(([command, description]) => `${command}`)
        .join(', ');
      
      speak(`Available voice commands include: ${commandList}. Say "more help" to hear additional commands.`);
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex items-center gap-1">
              <Button
                onClick={toggleListening}
                variant="outline"
                size="icon"
                className={`relative h-10 w-10 rounded-full transition-colors ${
                  isListening ? 'bg-red-100 dark:bg-red-900 border-red-500' : ''
                }`}
                aria-label={isListening ? 'Stop voice commands' : 'Start voice commands'}
              >
                {isListening ? (
                  <MicOff className="h-5 w-5 text-red-500" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
                <span className="sr-only">
                  {isListening ? 'Disable voice commands' : 'Enable voice commands'}
                </span>
                {isListening && (
                  <span
                    className="absolute -right-1 -top-1 flex h-3 w-3"
                    aria-hidden="true"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </Button>
              
              {/* Stop Speaking Button, only shown when speech is active */}
              {(isSpeaking || isAccessibilitySpeaking) && (
                <Button
                  onClick={handleStopSpeaking}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900 border-yellow-500"
                  aria-label="Stop speaking"
                >
                  <VolumeX className="h-5 w-5 text-yellow-700 dark:text-yellow-300" />
                  <span className="sr-only">Stop speaking</span>
                </Button>
              )}
              
              {/* Help Button */}
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setShowCommandList(true);
                    speakCommands();
                  }}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full ml-1"
                  aria-label="Voice command help"
                >
                  <Volume2 className="h-5 w-5" />
                  <span className="sr-only">Voice command help</span>
                </Button>
              </DialogTrigger>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <p className="font-semibold mb-1">Voice Commands</p>
            <p className="text-xs">
              {isListening ? "Listening for voice commands" : "Click to enable voice commands"}. 
              Say "help" to hear available commands.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Dialog open={showCommandList} onOpenChange={setShowCommandList}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Available Voice Commands</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {Object.entries(commandGroups).map(([category, commands]) => (
              <div key={category} className="space-y-2">
                <h3 className="font-medium text-lg">{category} Commands</h3>
                <ul className="space-y-2">
                  {commands.map(({command, description}) => (
                    <li key={command} className="flex flex-col">
                      <span className="font-medium text-primary">"{command}"</span>
                      <span className="text-sm text-muted-foreground">{description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Say "help" at any time to hear available commands. Say "read page" to have the current page read aloud.</p>
          </div>
          
          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => setShowCommandList(false)}
            >
              Close
            </Button>
            <Button
              onClick={speakCommands}
              className="gap-1"
            >
              <Volume2 className="h-4 w-4" />
              Hear Commands
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
