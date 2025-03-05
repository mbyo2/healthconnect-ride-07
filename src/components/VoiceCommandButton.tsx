
import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceCommands, VOICE_COMMANDS } from '@/hooks/use-voice-commands';
import { useTheme } from '@/hooks/use-theme';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const VoiceCommandButton = () => {
  const { theme, setTheme } = useTheme();
  const { isListening, startListening, stopListening } = useVoiceCommands({
    setTheme,
    theme,
  });

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Format commands for display in tooltip
  const commandsList = Object.entries(VOICE_COMMANDS)
    .map(([command, description]) => `${command}: ${description}`)
    .join('\n');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent className="max-w-sm whitespace-pre-line">
          <p className="font-semibold mb-1">Voice Commands</p>
          <p className="text-xs">
            {commandsList}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
