
/**
 * Utility for older Android/WebView compatibility
 */

export const isLegacyAndroid = () => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const androidMatch = ua.match(/Android\s([0-9\.]+)/);
  if (androidMatch) {
    const version = parseFloat(androidMatch[1]);
    return version < 7.0; // Android 5 and 6
  }
  return false;
};

export const applyLegacyFixes = () => {
  if (isLegacyAndroid()) {
    document.documentElement.classList.add('is-legacy-android');
    
    // Polyfill for RequestAnimationFrame if missing
    if (!window.requestAnimationFrame) {
      (window as any).requestAnimationFrame = (callback: any) => {
        return window.setTimeout(() => callback(Date.now()), 16);
      };
    }

    // Fix for older WebViews that don't support some CSS variables properly
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    if (!styles.getPropertyValue('--background')) {
       // Fallback logic if needed
    }
  }
};
