import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Add type definitions for the Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

// Define global types for the Speech API
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

// List of supported commands and their descriptions
export const VOICE_COMMANDS = {
  'go home': 'Navigate to the home page',
  'search': 'Navigate to search page',
  'find doctor': 'Navigate to search page filtered for doctors',
  'find healthcare': 'Navigate to search page',
  'appointments': 'Navigate to appointments page',
  'profile': 'Navigate to profile page',
  'toggle theme': 'Switch between light and dark mode',
  'light mode': 'Switch to light mode',
  'dark mode': 'Switch to dark mode',
  'stop listening': 'Turn off voice commands',
  'start listening': 'Turn on voice commands',
  'help': 'List available commands',
};

interface UseVoiceCommandsProps {
  setTheme?: (theme: 'light' | 'dark' | 'system') => void;
  theme?: string;
}

export const useVoiceCommands = ({ setTheme, theme }: UseVoiceCommandsProps = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const navigate = useNavigate();

  // Initialize speech recognition
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognitionAPI ? new SpeechRecognitionAPI() : null;
  
  if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
  }

  const announceForScreenReader = (message: string) => {
    // Create an ARIA live region announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('class', 'sr-only');
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    // Remove it after it's been announced
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  const executeCommand = useCallback((command: string) => {
    const normalizedCommand = command.toLowerCase().trim();
    
    // Handle navigation commands
    if (normalizedCommand === 'go home') {
      navigate('/');
      announceForScreenReader('Navigating to home page');
      return true;
    }
    
    if (normalizedCommand === 'search' || normalizedCommand === 'find healthcare' || normalizedCommand === 'find doctor') {
      navigate('/search');
      announceForScreenReader('Navigating to search page');
      return true;
    }
    
    if (normalizedCommand === 'appointments') {
      navigate('/appointments');
      announceForScreenReader('Navigating to appointments page');
      return true;
    }
    
    if (normalizedCommand === 'profile') {
      navigate('/profile');
      announceForScreenReader('Navigating to profile page');
      return true;
    }
    
    // Handle theme commands
    if (setTheme && theme) {
      if (normalizedCommand === 'toggle theme') {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        announceForScreenReader(`Switched to ${newTheme} mode`);
        return true;
      }
      
      if (normalizedCommand === 'light mode') {
        setTheme('light');
        announceForScreenReader('Switched to light mode');
        return true;
      }
      
      if (normalizedCommand === 'dark mode') {
        setTheme('dark');
        announceForScreenReader('Switched to dark mode');
        return true;
      }
    }
    
    // Handle listening control commands
    if (normalizedCommand === 'stop listening') {
      stopListening();
      announceForScreenReader('Voice commands turned off');
      return true;
    }
    
    if (normalizedCommand === 'start listening') {
      startListening();
      announceForScreenReader('Voice commands activated');
      return true;
    }
    
    // Handle help command
    if (normalizedCommand === 'help') {
      const helpText = 'Available commands: ' + 
        Object.keys(VOICE_COMMANDS).join(', ');
      announceForScreenReader(helpText);
      toast.info(helpText);
      return true;
    }
    
    return false;
  }, [navigate, setTheme, theme]);

  const handleResult = useCallback((event: SpeechRecognitionEvent) => {
    const transcriptText = Array.from(event.results)
      .map((result: SpeechRecognitionResult) => result[0].transcript)
      .join('');
    
    setTranscript(transcriptText);
    
    const lastResult = event.results[event.results.length - 1];
    if (lastResult.isFinal) {
      const command = lastResult[0].transcript.trim();
      const commandExecuted = executeCommand(command);
      
      if (commandExecuted) {
        toast.success(`Command executed: ${command}`);
      }
    }
  }, [executeCommand]);

  const startListening = useCallback(() => {
    if (!recognition) {
      toast.error('Speech recognition is not supported in this browser');
      return;
    }
    
    recognition.start();
    setIsListening(true);
    toast.success('Voice commands activated');
    announceForScreenReader('Voice commands activated');
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (!recognition) return;
    
    recognition.stop();
    setIsListening(false);
    toast.info('Voice commands deactivated');
    announceForScreenReader('Voice commands deactivated');
  }, [recognition]);

  // Set up event listeners
  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = handleResult;
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied');
        setIsListening(false);
      }
    };
    
    recognition.onend = () => {
      // Only restart if we're still in listening mode
      // This prevents it from restarting after explicit stop
      if (isListening) {
        recognition.start();
      }
    };

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      if (isListening) {
        recognition.stop();
      }
    };
  }, [recognition, handleResult, isListening]);

  return {
    isListening,
    startListening,
    stopListening,
    transcript,
    executeCommand,
  };
};
