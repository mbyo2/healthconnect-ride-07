
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  }
}

// Export voice commands for reference
export { VOICE_COMMANDS } from './voice-command-constants';

// Import necessary functionality from modules
import { startListening, stopListening } from './voice-command-listeners';
import { executeCommand } from './voice-command-executor';

interface UseVoiceCommandsProps {
  setTheme?: (theme: 'light' | 'dark' | 'system') => void;
  theme?: string;
}

export const useVoiceCommands = ({ setTheme, theme }: UseVoiceCommandsProps = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const navigate = useNavigate();
  const accessibility = useAccessibility();
  const { screenReaderAnnounce } = accessibility || { screenReaderAnnounce: () => {} };
  // ALL speech in this subsystem flows through the AccessibilityContext
  // choke point (speakContent / stopSpeaking / isSpeaking). This hook
  // previously used a private ungated speak() that talked straight to
  // speechSynthesis — it let Search read results aloud with the voice
  // setting off (CEO bug, 2026-11-11). Spoken responses happen only
  // inside a voice session the user explicitly started (microphone
  // button), or via screenReaderAnnounce, which the context speaks aloud
  // only when screen reader mode is on.
  const speakContent = accessibility?.speakContent ?? (() => {});
  const stopSpeaking = accessibility?.stopSpeaking ?? (() => {});
  const isSpeaking = accessibility?.isSpeaking ?? false;
  
  // Use try/catch to safely access SearchContext
  let searchContext;
  try {
    searchContext = useSearch();
  } catch (error) {
    // SearchContext is not available, searchContext will remain undefined
    console.log('SearchContext not available in current component tree');
  }

  // The SpeechRecognition instance is created ONCE and memoised
  // (defect fix, 2026-11-13): it used to be constructed on EVERY render,
  // so the attach effect below re-ran each render — handlers re-attached
  // and the cleanup (which stops recognition) ran on every render.
  const recognition = useMemo<SpeechRecognition | null>(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;
    const instance = new SpeechRecognitionAPI();
    instance.continuous = true;
    instance.interimResults = false;
    instance.lang = 'en-US';
    return instance;
  }, []);

  // Define announceForScreenReader. The announcement always reaches
  // assistive technology via the aria-live region; it is SPOKEN aloud
  // only when the user has screen reader mode on — the context owns that
  // gate. (This used to also call a private speak() unconditionally, so
  // every announcement was spoken even with the mode off.)
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
  }, [screenReaderAnnounce]);

  // Start listening implementation
  const startListeningHandler = useCallback(() => {
    if (!recognition) {
      toast.error('Speech recognition is not supported in this browser');
      return;
    }
    
    // If speaking, wait until speech is done
    if (isSpeaking) {
      stopSpeaking();
    }

    startListening(recognition);
    setIsListening(true);
    toast.success('Voice commands activated');
    announceForScreenReader('Voice commands activated, I am now listening. Say "help" for available commands.');
  }, [recognition, isSpeaking, stopSpeaking, announceForScreenReader]);

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
        speak: speakContent
      });

      if (commandExecuted) {
        toast.success(`Command executed: ${command}`);
      } else {
        // Provide feedback when command is not recognized — spoken via
        // the choke point, inside the session the user started.
        speakContent(`Sorry, I didn't understand the command: ${command}. Say "help" for available commands.`);
      }
    }
  }, [
    navigate,
    setTheme,
    theme,
    stopListeningHandler,
    startListeningHandler,
    announceForScreenReader,
    searchContext,
    speakContent
  ]);

  // Latest-callback / latest-state refs for the attach effect below.
  // handleResult changes identity whenever its deps change (notably the
  // SearchContext value object, which is rebuilt on every provider
  // render), and isListening/isSpeaking flip on state transitions — none
  // of that may re-attach the recognition handlers. The effect reads the
  // current values through these refs instead, so it runs once per
  // (memoised) recognition instance and cleans up only when that
  // instance goes away.
  const handleResultRef = useRef(handleResult);
  handleResultRef.current = handleResult;
  const isListeningRef = useRef(isListening);
  isListeningRef.current = isListening;
  const isSpeakingRef = useRef(isSpeaking);
  isSpeakingRef.current = isSpeaking;

  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event: SpeechRecognitionEvent) =>
      handleResultRef.current(event);

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied');
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Only restart if we are supposed to be listening and not currently speaking
      if (isListeningRef.current && !isSpeakingRef.current) {
        recognition.start();
      }
    };

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      if (isListeningRef.current) {
        recognition.stop();
      }
    };
  }, [recognition]);

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
      speak: speakContent
    }),
    // The context choke point, re-exported for the explicit one-shot
    // controls in VoiceCommandButton (Hear Commands / help).
    speak: speakContent
  };
};
