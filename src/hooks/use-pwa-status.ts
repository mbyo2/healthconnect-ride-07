
import { useEffect, useState } from "react";
import { checkIfAppInstalled, checkServiceWorkerStatus } from "@/utils/service-worker";

export function usePwaStatus() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [isServiceWorkerActive, setIsServiceWorkerActive] = useState<boolean | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);

  useEffect(() => {
    const checkPwaStatus = async () => {
      // Check if app is installed
      setIsInstalled(checkIfAppInstalled());
      
      // Check service worker status
      const swStatus = await checkServiceWorkerStatus();
      setIsServiceWorkerActive(swStatus);
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
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
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
  
  return {
    isInstalled,
    isServiceWorkerActive,
    canInstall: !!installPromptEvent,
    promptInstall,
  };
}
