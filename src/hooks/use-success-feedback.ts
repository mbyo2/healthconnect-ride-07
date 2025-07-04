import { useCallback } from 'react';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

interface SuccessFeedbackOptions {
  message: string;
  playSound?: boolean;
  showVisual?: boolean;
  duration?: number;
}

export const useSuccessFeedback = () => {
  const playSuccessSound = useCallback(() => {
    try {
      // Create a simple success beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Higher pitch for success
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('Could not play success sound:', error);
    }
  }, []);

  const showSuccess = useCallback(({
    message,
    playSound = true,
    showVisual = true,
    duration = 3000
  }: SuccessFeedbackOptions) => {
    if (showVisual) {
      toast.success(message, {
        duration,
        style: {
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
        },
        className: 'touch-manipulation',
      });
    }
    
    if (playSound) {
      playSuccessSound();
    }
  }, [playSuccessSound]);

  return { showSuccess, playSuccessSound };
};