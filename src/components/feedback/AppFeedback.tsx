import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react";

type FeedbackType = "success" | "error" | "warning" | "info" | "loading";

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  title: string;
  description?: string;
}

interface FeedbackContextValue {
  show: (type: FeedbackType, title: string, description?: string) => string;
  dismiss: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export const useAppFeedback = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useAppFeedback must be used within AppFeedbackProvider");
  return ctx;
};

const ICONS: Record<FeedbackType, any> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

const COLORS: Record<FeedbackType, string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-600",
  loading: "bg-blue-600",
};

/**
 * App-native feedback: bottom-centered, icon-prominent, branded.
 * Feels like the app talking — not a browser notification.
 */
export const AppFeedbackProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<FeedbackItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const show = useCallback(
    (type: FeedbackType, title: string, description?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setItems((prev) => [...prev.slice(-2), { id, type, title, description }]);

      // Haptic
      if (navigator.vibrate) {
        try {
          navigator.vibrate(type === "error" ? [40, 30, 40] : 20);
        } catch { /* ignore */ }
      }

      // Auto-dismiss (except loading)
      if (type !== "loading") {
        setTimeout(() => dismiss(id), type === "error" ? 5000 : 3500);
      }
      return id;
    },
    [dismiss]
  );

  // Listen for app-feedback events from non-component contexts
  // (e.g. async handlers that can't use the hook)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type && detail?.title) {
        show(detail.type, detail.title, detail.description);
      }
    };
    window.addEventListener("app-feedback", handler);
    return () => window.removeEventListener("app-feedback", handler);
  }, [show]);

  const value: FeedbackContextValue = {
    show,
    dismiss,
    success: (t, d) => show("success", t, d),
    error: (t, d) => show("error", t, d),
    warning: (t, d) => show("warning", t, d),
    info: (t, d) => show("info", t, d),
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {/* Bottom-centered stack, above content, below header */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none px-4 w-full max-w-sm">
        {items.map((item) => {
          const Icon = ICONS[item.type];
          return (
            <div
              key={item.id}
              onClick={() => dismiss(item.id)}
              className="pointer-events-auto w-full flex items-center gap-3 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
            >
              <div
                className={`h-10 w-10 rounded-full ${COLORS[item.type]} flex items-center justify-center shrink-0`}
              >
                <Icon
                  className={`h-5 w-5 text-white ${item.type === "loading" ? "animate-spin" : ""}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-gray-500 truncate">{item.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </FeedbackContext.Provider>
  );
};
