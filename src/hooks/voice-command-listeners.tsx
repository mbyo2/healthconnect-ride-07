
// Define SpeechRecognition types to avoid TypeScript errors
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

// Define missing types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

// Helper functions for voice command recognition

// Start the speech recognition
export const startListening = (recognition: SpeechRecognition) => {
  try {
    recognition.start();
  } catch (error) {
    console.error('Error starting speech recognition:', error);
  }
};

// Stop the speech recognition
export const stopListening = (recognition: SpeechRecognition) => {
  try {
    recognition.stop();
  } catch (error) {
    console.error('Error stopping speech recognition:', error);
  }
};
