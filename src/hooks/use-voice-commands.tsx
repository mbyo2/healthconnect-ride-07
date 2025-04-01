
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useSearch } from '@/context/SearchContext';

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

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
    speechSynthesis?: SpeechSynthesis;
  }
}

export const VOICE_COMMANDS = {
  'go home': 'Navigate to the home page',
  'symptoms': 'Navigate to the symptom collector',
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
  'read page': 'Read the current page content aloud',
  'search for': 'Search for a specific healthcare provider',
  'find nearby': 'Find healthcare providers near you',
  'filter by specialty': 'Filter search results by specialty',
  'filter by insurance': 'Filter search results by insurance',
  'set distance': 'Set maximum distance for search results',
  'use my location': 'Use current location for search',
  'book appointment': 'Book an appointment with selected provider',
  'next page': 'Go to next page of results',
  'previous page': 'Go to previous page of results',
  'help': 'List available commands',
};

interface UseVoiceCommandsProps {
  setTheme?: (theme: 'light' | 'dark' | 'system') => void;
  theme?: string;
}

export const useVoiceCommands = ({ setTheme, theme }: UseVoiceCommandsProps = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const navigate = useNavigate();
  const { screenReaderAnnounce } = useAccessibility?.() || { screenReaderAnnounce: () => {} };
  const searchContext = useSearch?.();

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognitionAPI ? new SpeechRecognitionAPI() : null;
  
  if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
  }

  const speak = useCallback((message: string) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // Resume listening after speaking if it was active
      if (isListening && recognition) {
        recognition.start();
      }
    };

    // Temporarily pause listening while speaking to prevent feedback loops
    if (isListening && recognition) {
      recognition.stop();
    }

    window.speechSynthesis.speak(utterance);
    
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isListening, recognition]);

  const announceForScreenReader = (message: string) => {
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
    speak(message);
  };

  const readPageContent = useCallback(() => {
    // Get main content
    const mainContent = document.getElementById('main-content');
    let contentToRead = '';
    
    if (mainContent) {
      // Get all text nodes and heading elements
      const elements = mainContent.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, button, a');
      contentToRead = Array.from(elements)
        .map(el => el.textContent)
        .filter(Boolean)
        .join('. ');
    } else {
      // Fallback to reading visible text from the page
      const visibleElements = document.querySelectorAll('h1, h2, h3, p, button:not([aria-hidden="true"])');
      contentToRead = Array.from(visibleElements)
        .map(el => el.textContent)
        .filter(Boolean)
        .join('. ');
    }
    
    if (contentToRead) {
      speak(`Page content: ${contentToRead}`);
      return true;
    }
    
    speak("I couldn't find any content to read on this page.");
    return false;
  }, [speak]);

  const handleSearchCommand = useCallback((query: string) => {
    if (!searchContext?.setSearchTerm) {
      speak("Search functionality is not available on this page. Please navigate to the search page first.");
      return false;
    }
    
    searchContext.setSearchTerm(query);
    speak(`Searching for ${query}`);
    
    // If not already on search page, navigate there
    if (window.location.pathname !== '/search') {
      navigate('/search');
    }
    
    if (searchContext.refreshProviders) {
      searchContext.refreshProviders();
    }
    
    return true;
  }, [navigate, searchContext, speak]);

  const handleFilterBySpecialty = useCallback((specialty: string) => {
    if (!searchContext?.setSelectedSpecialty) {
      speak("Filtering is not available on this page. Please navigate to the search page first.");
      return false;
    }
    
    // Find closest matching specialty from available options
    const specialties = ['General Practice', 'Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 
      'Dermatology', 'Gynecology', 'Oncology', 'Psychiatry', 'Ophthalmology', 'Family Medicine'];
    
    const matchedSpecialty = specialties.find(s => 
      s.toLowerCase().includes(specialty.toLowerCase()) || 
      specialty.toLowerCase().includes(s.toLowerCase())
    );
    
    if (matchedSpecialty) {
      searchContext.setSelectedSpecialty(matchedSpecialty as any);
      speak(`Filtering by specialty: ${matchedSpecialty}`);
      
      if (searchContext.refreshProviders) {
        searchContext.refreshProviders();
      }
      
      return true;
    } else {
      speak(`Could not find specialty matching ${specialty}. Available specialties include: General Practice, Cardiology, Neurology, and others.`);
      return false;
    }
  }, [searchContext, speak]);

  const handleFilterByInsurance = useCallback((insurance: string) => {
    if (!searchContext?.setSelectedInsurance) {
      speak("Filtering is not available on this page. Please navigate to the search page first.");
      return false;
    }
    
    // Find closest matching insurance from available options
    const insurances = ['Medicare', 'Medicaid', 'Blue Cross', 'Cigna', 'UnitedHealthcare', 'Aetna', 'Humana'];
    
    const matchedInsurance = insurances.find(i => 
      i.toLowerCase().includes(insurance.toLowerCase()) || 
      insurance.toLowerCase().includes(i.toLowerCase())
    );
    
    if (matchedInsurance) {
      searchContext.setSelectedInsurance(matchedInsurance as any);
      speak(`Filtering by insurance: ${matchedInsurance}`);
      
      if (searchContext.refreshProviders) {
        searchContext.refreshProviders();
      }
      
      return true;
    } else {
      speak(`Could not find insurance matching ${insurance}. Available options include: Medicare, Medicaid, Blue Cross, and others.`);
      return false;
    }
  }, [searchContext, speak]);

  const handleSetDistance = useCallback((distanceStr: string) => {
    if (!searchContext?.setMaxDistance) {
      speak("Distance setting is not available on this page. Please navigate to the search page first.");
      return false;
    }
    
    // Extract number from the command
    const distanceMatch = distanceStr.match(/\d+/);
    if (distanceMatch) {
      const distance = parseInt(distanceMatch[0], 10);
      if (!isNaN(distance) && distance > 0) {
        searchContext.setMaxDistance(distance);
        speak(`Setting maximum distance to ${distance} kilometers`);
        
        if (searchContext.refreshProviders) {
          searchContext.refreshProviders();
        }
        
        return true;
      }
    }
    
    speak("Please specify a valid distance, for example: set distance 20 kilometers");
    return false;
  }, [searchContext, speak]);

  const handleUseLocation = useCallback((enable: boolean = true) => {
    if (!searchContext?.setUseUserLocation) {
      speak("Location setting is not available on this page. Please navigate to the search page first.");
      return false;
    }
    
    searchContext.setUseUserLocation(enable);
    speak(enable ? "Using your current location for search" : "Stopped using your location for search");
    
    if (searchContext.refreshProviders) {
      searchContext.refreshProviders();
    }
    
    return true;
  }, [searchContext, speak]);

  const executeCommand = useCallback((command: string) => {
    const normalizedCommand = command.toLowerCase().trim();
    
    // Basic navigation commands
    if (normalizedCommand === 'go home' || normalizedCommand === 'symptoms') {
      navigate('/symptoms');
      announceForScreenReader('Navigating to symptom collector');
      return true;
    }
    
    if (normalizedCommand === 'search' || normalizedCommand === 'find healthcare') {
      navigate('/search');
      announceForScreenReader('Navigating to search page');
      return true;
    }
    
    if (normalizedCommand === 'find doctor') {
      navigate('/search');
      if (searchContext?.setSelectedType) {
        searchContext.setSelectedType('doctor');
        announceForScreenReader('Navigating to search page, filtered for doctors');
      } else {
        announceForScreenReader('Navigating to search page');
      }
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
    
    // Theme commands
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
    
    // Voice command control
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
    
    // Screen reader commands
    if (normalizedCommand === 'read page' || normalizedCommand === 'read screen') {
      return readPageContent();
    }
    
    // Complex search commands
    if (normalizedCommand.startsWith('search for ')) {
      const query = normalizedCommand.replace('search for ', '');
      return handleSearchCommand(query);
    }
    
    if (normalizedCommand === 'find nearby' || normalizedCommand === 'find near me') {
      return handleUseLocation(true);
    }
    
    if (normalizedCommand.startsWith('filter by specialty ')) {
      const specialty = normalizedCommand.replace('filter by specialty ', '');
      return handleFilterBySpecialty(specialty);
    }
    
    if (normalizedCommand.startsWith('filter by insurance ')) {
      const insurance = normalizedCommand.replace('filter by insurance ', '');
      return handleFilterByInsurance(insurance);
    }
    
    if (normalizedCommand.includes('distance')) {
      return handleSetDistance(normalizedCommand);
    }
    
    if (normalizedCommand === 'use my location') {
      return handleUseLocation(true);
    }
    
    if (normalizedCommand === 'stop using my location') {
      return handleUseLocation(false);
    }
    
    // Pagination commands
    if (normalizedCommand === 'next page' || normalizedCommand === 'next results') {
      if (searchContext?.loadMore) {
        searchContext.loadMore();
        announceForScreenReader('Loading more results');
        return true;
      }
    }
    
    // Help command
    if (normalizedCommand === 'help' || normalizedCommand === 'what can i say') {
      const helpText = 'Available commands include: ' + 
        Object.keys(VOICE_COMMANDS).slice(0, 10).join(', ') + 
        ' and more. Say "more help" for additional commands.';
      announceForScreenReader(helpText);
      return true;
    }
    
    if (normalizedCommand === 'more help') {
      const moreHelpText = 'Additional commands include: ' + 
        Object.keys(VOICE_COMMANDS).slice(10).join(', ');
      announceForScreenReader(moreHelpText);
      return true;
    }
    
    return false;
  }, [navigate, setTheme, theme, readPageContent, handleSearchCommand, 
      handleFilterBySpecialty, handleFilterByInsurance, handleSetDistance, 
      handleUseLocation, announceForScreenReader, searchContext, stopListening, startListening]);

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
      } else {
        // Provide feedback when command is not recognized
        speak(`Sorry, I didn't understand the command: ${command}. Say "help" for available commands.`);
      }
    }
  }, [executeCommand, speak]);

  const startListening = useCallback(() => {
    if (!recognition) {
      toast.error('Speech recognition is not supported in this browser');
      return;
    }
    
    // If speaking, wait until speech is done
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
    }
    
    recognition.start();
    setIsListening(true);
    toast.success('Voice commands activated');
    announceForScreenReader('Voice commands activated, I am now listening. Say "help" for available commands.');
  }, [recognition, isSpeaking, announceForScreenReader]);

  const stopListening = useCallback(() => {
    if (!recognition) return;
    
    recognition.stop();
    setIsListening(false);
    toast.info('Voice commands deactivated');
    announceForScreenReader('Voice commands deactivated');
  }, [recognition, announceForScreenReader]);

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
    startListening,
    stopListening,
    transcript,
    executeCommand,
    speak
  };
};
