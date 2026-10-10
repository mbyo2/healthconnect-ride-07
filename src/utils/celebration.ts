import confetti from "canvas-confetti";

/**
 * Duolingo-style celebration loop: confetti burst + haptic feedback.
 * Call after booking, profile completion, prescription fill, etc.
 */
export const celebrate = (options?: {
  message?: string;
  intensity?: "small" | "medium" | "large";
}) => {
  const { intensity = "medium" } = options || {};

  // Haptic feedback (mobile)
  if (navigator.vibrate) {
    try {
      navigator.vibrate(intensity === "large" ? [50, 30, 50] : 30);
    } catch {
      // ignore
    }
  }

  // Confetti burst in Doc'O Clock blue
  const colors = ["#2563eb", "#3b82f6", "#60a5fa", "#ffffff", "#fbbf24"];
  const base = {
    colors,
    disableForReducedMotion: true,
  };

  if (intensity === "small") {
    confetti({ ...base, particleCount: 40, spread: 60, origin: { y: 0.7 } });
  } else if (intensity === "medium") {
    confetti({ ...base, particleCount: 100, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => {
      confetti({ ...base, particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
      confetti({ ...base, particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
    }, 200);
  } else {
    // large: multi-burst celebration
    confetti({ ...base, particleCount: 150, spread: 100, origin: { y: 0.6 } });
    setTimeout(() => confetti({ ...base, particleCount: 100, spread: 120, origin: { y: 0.5 } }), 300);
    setTimeout(() => confetti({ ...base, particleCount: 80, spread: 80, origin: { y: 0.7 } }), 600);
  }
};

/**
 * Check if a time slot is "expiring soon" (within 2 hours) for urgency UI.
 */
export const isExpiringSoon = (slotTime: string, slotDate: Date): boolean => {
  try {
    const [hours, minutes] = slotTime.split(":").map(Number);
    const slotDateTime = new Date(slotDate);
    slotDateTime.setHours(hours, minutes || 0, 0, 0);
    const now = new Date();
    const diffMs = slotDateTime.getTime() - now.getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    return diffMs > 0 && diffMs <= twoHoursMs;
  } catch {
    return false;
  }
};
