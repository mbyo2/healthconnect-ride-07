import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface FeedbackOptions {
  enableSound?: boolean;
  enableHaptics?: boolean;
  enableVisual?: boolean;
  soundVolume?: number;
}

export interface CompletionFeedback {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  showCheckmark?: boolean;
}

export function useFeedbackSystem(options: FeedbackOptions = {}) {
  const {
    enableSound = true,
    enableHaptics = true,
    enableVisual = true,
    soundVolume = 0.5
  } = options;

  const audioContextRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize audio context
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current && enableSound) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Audio context not supported:', error);
      }
    }
  }, [enableSound]);

  // Play success sound
  const playSuccessSound = useCallback(async () => {
    if (!enableSound || !audioContextRef.current) return;

    try {
      setIsPlaying(true);
      const context = audioContextRef.current;
      
      // Create success sound (ascending notes)
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.setValueAtTime(523.25, context.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, context.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, context.currentTime + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(soundVolume * 0.3, context.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.4);
      
      setTimeout(() => setIsPlaying(false), 400);
    } catch (error) {
      console.warn('Error playing success sound:', error);
      setIsPlaying(false);
    }
  }, [enableSound, soundVolume]);

  // Play error sound
  const playErrorSound = useCallback(async () => {
    if (!enableSound || !audioContextRef.current) return;

    try {
      setIsPlaying(true);
      const context = audioContextRef.current;
      
      // Create error sound (descending notes)
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.setValueAtTime(400, context.currentTime); // Lower frequency
      oscillator.frequency.setValueAtTime(300, context.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(soundVolume * 0.2, context.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.3);
      
      setTimeout(() => setIsPlaying(false), 300);
    } catch (error) {
      console.warn('Error playing error sound:', error);
      setIsPlaying(false);
    }
  }, [enableSound, soundVolume]);

  // Trigger haptic feedback
  const triggerHaptics = useCallback((type: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!enableHaptics || !navigator.vibrate) return;

    const patterns = {
      light: [50],
      medium: [100],
      heavy: [200]
    };

    navigator.vibrate(patterns[type]);
  }, [enableHaptics]);

  // Show completion feedback
  const showCompletionFeedback = useCallback(async (feedback: CompletionFeedback) => {
    const { type, title, message, duration = 3000 } = feedback;

    // Play appropriate sound
    if (type === 'success') {
      await playSuccessSound();
      triggerHaptics('light');
    } else if (type === 'error') {
      await playErrorSound();
      triggerHaptics('heavy');
    }

    // Show visual feedback
    if (enableVisual) {
      toast[type](title, {
        description: message,
        duration,
      });
    }
  }, [enableVisual, playSuccessSound, playErrorSound, triggerHaptics]);

  // Quick success feedback
  const showSuccess = useCallback((title: string, message?: string) => {
    showCompletionFeedback({ type: 'success', title, message });
  }, [showCompletionFeedback]);

  // Quick error feedback
  const showError = useCallback((title: string, message?: string) => {
    showCompletionFeedback({ type: 'error', title, message });
  }, [showCompletionFeedback]);

  // Initialize on first use
  const initialize = useCallback(() => {
    initAudioContext();
  }, [initAudioContext]);

  return {
    showCompletionFeedback,
    showSuccess,
    showError,
    playSuccessSound,
    playErrorSound,
    triggerHaptics,
    initialize,
    isPlaying
  };
}
