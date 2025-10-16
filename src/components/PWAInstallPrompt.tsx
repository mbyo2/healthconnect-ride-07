
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { checkIfAppInstalled } from '@/utils/service-worker';
import { safeLocalGet, safeLocalSet } from '@/utils/storage';
import { X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    setIsAppInstalled(checkIfAppInstalled());

    // Save the install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
    };

    // Check if user has previously dismissed
    const hasUserDismissed = safeLocalGet('pwa-install-dismissed');
    if (hasUserDismissed) {
      setIsDismissed(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Show the install prompt
    await installPrompt.prompt();
    
    // Wait for user choice
    const choiceResult = await installPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setInstallPrompt(null);
    } else {
      console.log('User dismissed the install prompt');
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
     safeLocalSet('pwa-install-dismissed', 'true');
  };

  if (isAppInstalled || isDismissed || !installPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center px-4 animate-slide-in-bottom">
      <div className="bg-card border shadow-lg rounded-lg p-4 flex flex-col md:flex-row items-center gap-3 max-w-md relative">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-1 right-1" 
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="w-10 h-10 bg-[#4CAF50] rounded-full flex items-center justify-center text-white font-bold">
          D0C
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h3 className="font-medium">Install Doc' O Clock</h3>
          <p className="text-sm text-muted-foreground">Get quick access on your home screen</p>
        </div>
        
        <Button onClick={handleInstallClick} className="w-full md:w-auto">
          Install
        </Button>
      </div>
    </div>
  );
}
