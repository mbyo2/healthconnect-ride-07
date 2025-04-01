
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
