
// Function to speak messages aloud
export const speak = (message: string, setIsSpeaking: (value: boolean) => void) => {
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
  };

  window.speechSynthesis.speak(utterance);
  
  return () => {
    window.speechSynthesis.cancel();
  };
};

// Function to read page content
export const readPageContent = (speak: (message: string) => void) => {
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
};
