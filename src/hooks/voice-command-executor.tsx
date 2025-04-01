
import { NavigateFunction } from 'react-router-dom';
import { VOICE_COMMANDS } from './voice-command-constants';
import { readPageContent } from './voice-command-speech';

// Types for search context functionality
interface SearchContext {
  setSearchTerm?: (term: string) => void;
  setSelectedSpecialty?: (specialty: any) => void;
  setSelectedInsurance?: (insurance: any) => void;
  setMaxDistance?: (distance: number) => void;
  setUseUserLocation?: (use: boolean) => void;
  refreshProviders?: () => void;
  setSelectedType?: (type: string) => void;
  loadMore?: () => void;
}

interface ExecuteCommandProps {
  command: string;
  navigate: NavigateFunction;
  setTheme?: (theme: 'light' | 'dark' | 'system') => void;
  theme?: string;
  stopListening: () => void;
  startListening: () => void;
  announceForScreenReader: (message: string) => void;
  searchContext?: SearchContext;
  setIsSpeaking: (speaking: boolean) => void;
}

// Handle search command
const handleSearchCommand = (
  query: string, 
  navigate: NavigateFunction, 
  searchContext?: SearchContext,
  speak?: (message: string) => void
) => {
  if (!searchContext?.setSearchTerm) {
    speak && speak("Search functionality is not available on this page. Please navigate to the search page first.");
    return false;
  }
  
  searchContext.setSearchTerm(query);
  speak && speak(`Searching for ${query}`);
  
  // If not already on search page, navigate there
  if (window.location.pathname !== '/search') {
    navigate('/search');
  }
  
  if (searchContext.refreshProviders) {
    searchContext.refreshProviders();
  }
  
  return true;
};

// Handle filter by specialty
const handleFilterBySpecialty = (
  specialty: string,
  searchContext?: SearchContext,
  speak?: (message: string) => void
) => {
  if (!searchContext?.setSelectedSpecialty) {
    speak && speak("Filtering is not available on this page. Please navigate to the search page first.");
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
    speak && speak(`Filtering by specialty: ${matchedSpecialty}`);
    
    if (searchContext.refreshProviders) {
      searchContext.refreshProviders();
    }
    
    return true;
  } else {
    speak && speak(`Could not find specialty matching ${specialty}. Available specialties include: General Practice, Cardiology, Neurology, and others.`);
    return false;
  }
};

// Handle filter by insurance
const handleFilterByInsurance = (
  insurance: string,
  searchContext?: SearchContext,
  speak?: (message: string) => void
) => {
  if (!searchContext?.setSelectedInsurance) {
    speak && speak("Filtering is not available on this page. Please navigate to the search page first.");
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
    speak && speak(`Filtering by insurance: ${matchedInsurance}`);
    
    if (searchContext.refreshProviders) {
      searchContext.refreshProviders();
    }
    
    return true;
  } else {
    speak && speak(`Could not find insurance matching ${insurance}. Available options include: Medicare, Medicaid, Blue Cross, and others.`);
    return false;
  }
};

// Handle set distance
const handleSetDistance = (
  distanceStr: string,
  searchContext?: SearchContext,
  speak?: (message: string) => void
) => {
  if (!searchContext?.setMaxDistance) {
    speak && speak("Distance setting is not available on this page. Please navigate to the search page first.");
    return false;
  }
  
  // Extract number from the command
  const distanceMatch = distanceStr.match(/\d+/);
  if (distanceMatch) {
    const distance = parseInt(distanceMatch[0], 10);
    if (!isNaN(distance) && distance > 0) {
      searchContext.setMaxDistance(distance);
      speak && speak(`Setting maximum distance to ${distance} kilometers`);
      
      if (searchContext.refreshProviders) {
        searchContext.refreshProviders();
      }
      
      return true;
    }
  }
  
  speak && speak("Please specify a valid distance, for example: set distance 20 kilometers");
  return false;
};

// Handle use location
const handleUseLocation = (
  enable: boolean = true,
  searchContext?: SearchContext,
  speak?: (message: string) => void
) => {
  if (!searchContext?.setUseUserLocation) {
    speak && speak("Location setting is not available on this page. Please navigate to the search page first.");
    return false;
  }
  
  searchContext.setUseUserLocation(enable);
  speak && speak(enable ? "Using your current location for search" : "Stopped using your location for search");
  
  if (searchContext.refreshProviders) {
    searchContext.refreshProviders();
  }
  
  return true;
};

// Execute voice command
export const executeCommand = ({
  command,
  navigate,
  setTheme,
  theme,
  stopListening,
  startListening,
  announceForScreenReader,
  searchContext,
  setIsSpeaking
}: ExecuteCommandProps) => {
  // Helper function to speak messages
  const speakMessage = (message: string) => {
    import('./voice-command-speech').then(({ speak }) => {
      speak(message, setIsSpeaking);
    });
  };

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
    return true;
  }
  
  if (normalizedCommand === 'start listening') {
    startListening();
    return true;
  }
  
  // Screen reader commands
  if (normalizedCommand === 'read page' || normalizedCommand === 'read screen') {
    return readPageContent(speakMessage);
  }
  
  // Complex search commands - only if searchContext is available
  if (searchContext) {
    if (normalizedCommand.startsWith('search for ')) {
      const query = normalizedCommand.replace('search for ', '');
      return handleSearchCommand(query, navigate, searchContext, speakMessage);
    }
    
    if (normalizedCommand === 'find nearby' || normalizedCommand === 'find near me') {
      return handleUseLocation(true, searchContext, speakMessage);
    }
    
    if (normalizedCommand.startsWith('filter by specialty ')) {
      const specialty = normalizedCommand.replace('filter by specialty ', '');
      return handleFilterBySpecialty(specialty, searchContext, speakMessage);
    }
    
    if (normalizedCommand.startsWith('filter by insurance ')) {
      const insurance = normalizedCommand.replace('filter by insurance ', '');
      return handleFilterByInsurance(insurance, searchContext, speakMessage);
    }
    
    if (normalizedCommand.includes('distance')) {
      return handleSetDistance(normalizedCommand, searchContext, speakMessage);
    }
    
    if (normalizedCommand === 'use my location') {
      return handleUseLocation(true, searchContext, speakMessage);
    }
    
    if (normalizedCommand === 'stop using my location') {
      return handleUseLocation(false, searchContext, speakMessage);
    }
    
    // Pagination commands
    if (normalizedCommand === 'next page' || normalizedCommand === 'next results') {
      if (searchContext?.loadMore) {
        searchContext.loadMore();
        announceForScreenReader('Loading more results');
        return true;
      }
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
};
