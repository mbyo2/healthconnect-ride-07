
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useSearch } from '@/context/SearchContext';

// Global interface declarations for browser Speech APIs
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

// Augment window interface for speech APIs
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
    speechSynthesis?: SpeechSynthesis;
  }
}

// Export voice commands for reference
export { VOICE_COMMANDS } from './voice-command-constants';

// Import necessary functionality from modules
import { startListening, stopListening } from './voice-command-listeners';
import { executeCommand } from './voice-command-executor';
import { speak } from './voice-command-speech';

interface UseVoiceCommandsProps {
  setTheme?: (theme: 'light' | 'dark' | 'system') => void;
  theme?: string;
}

export const useVoiceCommands = ({ setTheme, theme }: UseVoiceCommandsProps = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const navigate = useNavigate();
  const accessibility = useAccessibility();
  const { screenReaderAnnounce } = accessibility || { screenReaderAnnounce: () => {} };
  
  // Use try/catch to safely access SearchContext
  let searchContext;
  try {
    searchContext = useSearch();
  } catch (error) {
    // SearchContext is not available, searchContext will remain undefined
    console.log('SearchContext not available in current component tree');
  }

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognitionAPI ? new SpeechRecognitionAPI() : null;
  
  if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
  }

  // Define announceForScreenReader
  const announceForScreenReader = useCallback((message: string) => {
    // Use accessibility context if available
    if (screenReaderAnnounce) {
      screenReaderAnnounce(message, true);
    } else {
      // Fallback method
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'assertive');
      announcement.setAttribute('class', 'sr-only');
      announcement.textContent = message;
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }

    // Also speak the message aloud
    speak(message, setIsSpeaking);
  }, [screenReaderAnnounce]);

  // Start listening implementation
  const startListeningHandler = useCallback(() => {
    if (!recognition) {
      toast.error('Speech recognition is not supported in this browser');
      return;
    }
    
    // If speaking, wait until speech is done
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
    }
    
    startListening(recognition);
    setIsListening(true);
    toast.success('Voice commands activated');
    announceForScreenReader('Voice commands activated, I am now listening. Say "help" for available commands.');
  }, [recognition, isSpeaking, announceForScreenReader]);

  // Stop listening implementation
  const stopListeningHandler = useCallback(() => {
    if (!recognition) return;
    
    stopListening(recognition);
    setIsListening(false);
    toast.info('Voice commands deactivated');
    announceForScreenReader('Voice commands deactivated');
  }, [recognition, announceForScreenReader]);

  // Handle speech recognition result
  const handleResult = useCallback((event: SpeechRecognitionEvent) => {
    const transcriptText = Array.from(event.results)
      .map((result: SpeechRecognitionResult) => result[0].transcript)
      .join('');
    
    setTranscript(transcriptText);
    
    const lastResult = event.results[event.results.length - 1];
    if (lastResult.isFinal) {
      const command = lastResult[0].transcript.trim();
      const commandExecuted = executeCommand({
        command, 
        navigate, 
        setTheme, 
        theme, 
        stopListening: stopListeningHandler, 
        startListening: startListeningHandler, 
        announceForScreenReader, 
        searchContext,
        setIsSpeaking
      });
      
      if (commandExecuted) {
        toast.success(`Command executed: ${command}`);
      } else {
        // Provide feedback when command is not recognized
        speak(`Sorry, I didn't understand the command: ${command}. Say "help" for available commands.`, setIsSpeaking);
      }
    }
  }, [
    navigate, 
    setTheme, 
    theme, 
    stopListeningHandler, 
    startListeningHandler, 
    announceForScreenReader, 
    searchContext
  ]);

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
      // Only restart if we are supposed to be listening and not currently speaking
      if (isListening && !isSpeaking) {
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
  }, [recognition, handleResult, isListening, isSpeaking]);

  return {
    isListening,
    isSpeaking,
    startListening: startListeningHandler,
    stopListening: stopListeningHandler,
    transcript,
    executeCommand: (command: string) => executeCommand({
      command, 
      navigate, 
      setTheme, 
      theme, 
      stopListening: stopListeningHandler, 
      startListening: startListeningHandler, 
      announceForScreenReader, 
      searchContext,
      setIsSpeaking
    }),
    speak: (message: string) => speak(message, setIsSpeaking)
  };
};
