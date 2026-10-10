import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

// Lenco hosted payment widget — PCI-safe: card details never touch our code.
// Docs: https://lenco-api.readme.io/v2.0/reference/accept-payments
// Widget: LencoPay.getPaid({ key, email, reference, amount, currency, channels, ... })

declare global {
  interface Window {
    LencoPay?: {
      getPaid: (options: LencoWidgetOptions) => void;
    };
  }
}

export interface LencoWidgetOptions {
  key: string;
  email: string;
  reference: string;
  amount: number;
  currency?: string;
  label?: string;
  bearer?: "merchant" | "customer";
  channels?: ("card" | "mobile-money")[];
  customer?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  onSuccess?: (response: { reference: string }) => void;
  onClose?: () => void;
  onConfirmationPending?: () => void;
}

const PROD_SCRIPT = "https://pay.lenco.co/js/v1/inline.js";
const SANDBOX_SCRIPT = "https://pay.sandbox.lenco.co/js/v1/inline.js";

// Public key is safe for frontend use (it's the publishable key, not the secret)
const LENCO_PUBLIC_KEY = import.meta.env.VITE_LENCO_PUBLIC_KEY || "";
const USE_SANDBOX = import.meta.env.VITE_LENCO_SANDBOX === "true";

/**
 * Loads Lenco's hosted payment widget and opens it on demand.
 * The widget handles card + mobile money in a Lenco-hosted checkout —
 * no card numbers ever pass through our frontend or backend.
 */
export function useLencoWidget() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadPromise = useRef<Promise<void> | null>(null);

  useEffect(() => {
    // Preload the widget script
    loadWidget().catch(() => {});
  }, []);

  const loadWidget = (): Promise<void> => {
    if (typeof window !== "undefined" && window.LencoPay) {
      setLoaded(true);
      return Promise.resolve();
    }
    if (loadPromise.current) return loadPromise.current;

    loadPromise.current = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = USE_SANDBOX ? SANDBOX_SCRIPT : PROD_SCRIPT;
      script.async = true;
      script.onload = () => {
        setLoaded(true);
        resolve();
      };
      script.onerror = () => {
        loadPromise.current = null;
        reject(new Error("Failed to load payment widget"));
      };
      document.body.appendChild(script);
    });
    return loadPromise.current;
  };

  const openWidget = async (options: Omit<LencoWidgetOptions, "key">): Promise<void> => {
    if (!LENCO_PUBLIC_KEY) {
      toast.error("Card payments are not configured yet.");
      return;
    }
    setLoading(true);
    try {
      await loadWidget();
      if (!window.LencoPay) {
        throw new Error("Payment widget failed to load");
      }
      window.LencoPay.getPaid({
        key: LENCO_PUBLIC_KEY,
        ...options,
      });
    } catch (e: any) {
      console.error("Lenco widget error:", e.message);
      toast.error("Could not open card payment. Please try mobile money.");
    } finally {
      setLoading(false);
    }
  };

  return { loaded, loading, openWidget };
}

export function generateWidgetReference(prefix = "W"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
