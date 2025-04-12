
import { useEffect, useState } from "react";
import { checkIfAppInstalled, checkServiceWorkerStatus } from "@/utils/service-worker";

export function usePwaStatus() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [isServiceWorkerActive, setIsServiceWorkerActive] = useState<boolean | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [cachingComplete, setCachingComplete] = useState(false);

  useEffect(() => {
    const checkPwaStatus = async () => {
      // Check if app is installed
      setIsInstalled(checkIfAppInstalled());
      
      // Check service worker status
      const swStatus = await checkServiceWorkerStatus();
      setIsServiceWorkerActive(swStatus);
      
      // Check if initial caching is complete
      if (swStatus && 'caches' in window) {
        try {
          const cache = await caches.open('doc-o-clock-cache-v1');
          const keys = await cache.keys();
          setCachingComplete(keys.length > 0);
        } catch (err) {
          console.error('Error checking cache status:', err);
        }
      }
    };
    
    checkPwaStatus();
    
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67+ from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setInstallPromptEvent(e);
    };
    
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
    };
    
    const handleControllerChange = () => {
      // Service worker has been updated
      checkPwaStatus();
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
    };
  }, []);
  
  const promptInstall = async () => {
    if (!installPromptEvent) {
      console.log('No install prompt event saved');
      return false;
    }
    
    // Show the install prompt
    installPromptEvent.prompt();
    
    // Wait for the user to respond to the prompt
    const choiceResult = await installPromptEvent.userChoice;
    
    // Reset the install prompt
    setInstallPromptEvent(null);
    
    return choiceResult.outcome === 'accepted';
  };
  
  const forceUpdateServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.update();
      }
      return true;
    }
    return false;
  };
  
  return {
    isInstalled,
    isServiceWorkerActive,
    canInstall: !!installPromptEvent,
    cachingComplete,
    promptInstall,
    forceUpdateServiceWorker,
  };
}
