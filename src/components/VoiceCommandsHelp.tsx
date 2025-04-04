
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useVoiceCommands } from '@/hooks/use-voice-commands';
import { Button } from '@/components/ui/button';
import { Mic, Info, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAccessibility } from '@/context/AccessibilityContext';

// Define a command type to match the structure needed
interface VoiceCommand {
  example: string;
  action: string;
  category: string;
}

// Import voice commands as any to avoid type issues
const VOICE_COMMANDS: VoiceCommand[] = [
  { example: "Go home", action: "Navigate to home", category: "navigation" },
  { example: "Find doctors", action: "Search providers", category: "search" },
  { example: "Appointments", action: "View appointments", category: "navigation" },
  { example: "Toggle theme", action: "Switch theme", category: "accessibility" },
  { example: "Light mode", action: "Set light theme", category: "accessibility" },
  { example: "Dark mode", action: "Set dark theme", category: "accessibility" },
  { example: "Read page", action: "Screen reader", category: "accessibility" },
  { example: "Help", action: "Show commands", category: "general" },
  { example: "Stop listening", action: "Deactivate voice", category: "general" }
];

export const VoiceCommandsHelp: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { isListening, startListening, stopListening } = useVoiceCommands();
  const accessibilityContext = useAccessibility();
  const highContrast = accessibilityContext && 'highContrast' in accessibilityContext ? accessibilityContext.highContrast : false;

  // Register keyboard shortcut Alt+/ to open help dialog
  useHotkeys('alt+/', () => setOpen(true), { enableOnFormTags: true });

  // Group commands by category for better organization
  const commandCategories = {
    navigation: VOICE_COMMANDS.filter(cmd => cmd.category === 'navigation'),
    search: VOICE_COMMANDS.filter(cmd => cmd.category === 'search'),
    accessibility: VOICE_COMMANDS.filter(cmd => cmd.category === 'accessibility'),
    general: VOICE_COMMANDS.filter(cmd => cmd.category === 'general'),
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => isListening ? stopListening() : startListening()}
          className={`rounded-full w-12 h-12 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'} ${highContrast ? 'border-2 border-black dark:border-white' : ''}`}
          aria-label={isListening ? "Stop voice commands" : "Start voice commands"}
        >
          <Mic className={`h-5 w-5 ${isListening ? 'animate-pulse' : ''}`} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}
          className="rounded-full w-8 h-8 absolute -top-3 -left-3 bg-background"
          aria-label="Voice commands help"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Commands
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Navigation Commands</h3>
              <div className="space-y-2">
                {commandCategories.navigation.map((command, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                    <span className="text-sm font-medium">{command.example}</span>
                    <Badge variant="outline">{command.action}</Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Search Commands</h3>
              <div className="space-y-2">
                {commandCategories.search.map((command, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                    <span className="text-sm font-medium">{command.example}</span>
                    <Badge variant="outline">{command.action}</Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Accessibility Commands</h3>
              <div className="space-y-2">
                {commandCategories.accessibility.map((command, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                    <span className="text-sm font-medium">{command.example}</span>
                    <Badge variant="outline">{command.action}</Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">General Commands</h3>
              <div className="space-y-2">
                {commandCategories.general.map((command, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                    <span className="text-sm font-medium">{command.example}</span>
                    <Badge variant="outline">{command.action}</Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                Press <kbd className="px-1 py-0.5 bg-muted rounded border">Alt</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded border">/</kbd> to open this help dialog at any time.
              </p>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={() => {
            setOpen(false);
            isListening ? stopListening() : startListening();
          }}>
            {isListening ? "Stop Listening" : "Start Listening"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
