import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, X } from 'lucide-react';
import { MedGemmaChat } from '@/components/MedGemmaChat';
import { cn } from '@/lib/utils';

/**
 * Floating Doc O Clock AI chat — available on every page of the app.
 * WhatsApp-style: floating button opens a chat panel with full message text.
 * Hidden on /ai-diagnostics (the full-page chat already lives there).
 */
export const FloatingAIChat = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  if (location.pathname === '/ai-diagnostics') {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Doc O Clock AI chat"
          className={cn(
            'fixed z-50 right-4 bottom-24 sm:right-6 sm:bottom-8',
            'h-14 w-14 rounded-full bg-primary text-primary-foreground',
            'flex items-center justify-center shadow-xl',
            'hover:scale-105 active:scale-95 transition-transform',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
          )}
        >
          <Bot className="h-7 w-7" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white" />
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Doc O Clock AI chat"
          className={cn(
            'fixed z-50 bg-background border shadow-2xl flex flex-col overflow-hidden',
            // Mobile: near-full-screen sheet above the bottom nav
            'inset-x-3 bottom-24 top-20 rounded-2xl',
            // Desktop: floating card bottom-right
            'sm:inset-x-auto sm:top-auto sm:right-6 sm:bottom-8 sm:w-[400px] sm:h-[640px] sm:max-h-[75vh] sm:rounded-2xl'
          )}
        >
          {/* Brand header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground shrink-0">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold leading-tight">Doc O Clock</div>
              <div className="text-xs opacity-80 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />
                Online • AI Medical Helper
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="h-9 w-9 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Chat body — full WhatsApp-style conversation, no truncated text */}
          <div className="flex-1 min-h-0 [&>*]:h-full [&>*]:border-0 [&>*]:shadow-none [&>*]:rounded-none">
            <MedGemmaChat />
          </div>
        </div>
      )}
    </>
  );
};
