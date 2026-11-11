// Page-content extraction for the voice-command "read page" command.
//
// This module deliberately holds NO speech path of its own. It used to
// export a private speak() that drove the browser's speech engine
// directly, bypassing the accessibility screen-reader setting —
// SearchResults wired it to an effect and read every search result
// aloud for users who had never turned the voice on (CEO bug,
// 2026-11-11). All audible speech now goes through
// AccessibilityContext.speakContent, the app's single choke point;
// callers pass that function in here.

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
