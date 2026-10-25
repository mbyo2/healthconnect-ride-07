import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { safeLocalGet, safeLocalSet, safeLocalRemove } from '@/utils/storage';
import { supabase } from '@/integrations/supabase/client';

export type AccessibilityPreferences = {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  dyslexiaFont: boolean;
};

export type AccessibilityRecord = {
  preferences: AccessibilityPreferences;
  easyReading: boolean;
  textSize: number;
};

export const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  screenReader: false,
  dyslexiaFont: false,
};

export const DEFAULT_A11Y_RECORD: AccessibilityRecord = {
  preferences: { ...DEFAULT_PREFERENCES },
  easyReading: false,
  textSize: 1,
};

type SystemPreferences = { reducedMotion: boolean; highContrast: boolean };

type AccessibilityContextType = {
  screenReaderAnnounce: (message: string, assertive?: boolean) => void;
  skipToContent: () => void;
  isScreenReaderEnabled: boolean;
  setScreenReaderEnabled: (enabled: boolean) => void;
  speakContent: (message: string) => void;
  isSpeaking: boolean;
  stopSpeaking: () => void;
  increaseTextSize: () => void;
  decreaseTextSize: () => void;
  resetTextSize: () => void;
  textSize: number;
  enableEasyReading: () => void;
  disableEasyReading: () => void;
  isEasyReadingEnabled: boolean;
  preferences: AccessibilityPreferences;
  updatePreferences: (prefs: Partial<AccessibilityPreferences>) => void;
  resetAllAccessibility: () => void;
  /** Device/OS-level requests, DETECTED ONLY — never treated as the user's choice. */
  systemPreferences: SystemPreferences;
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

/**
 * Accessibility state guarantees (CEO-reported bug, fixed 2026-10-25):
 *
 * 1. PER-ACCOUNT, never browser-global. State lives under one localStorage
 *    record per scope — `a11y.v2.<user-id>` for a signed-in account and
 *    `a11y.v2.guest` when signed out — and, for signed-in users, is mirrored
 *    to their `user_settings` row so it follows the account across devices.
 *    The pre-fix global keys (`accessibility_*`) leaked one person's modes
 *    to the next person on the same browser and were never cleared on
 *    sign-out; they are now deleted on sight and NEVER adopted.
 * 2. OFF BY DEFAULT. A scope with no stored record gets every mode off and
 *    text size 1.0. OS/browser preferences (prefers-reduced-motion,
 *    prefers-contrast) are DETECTED and surfaced (`systemPreferences`) but
 *    are never written into the user's preferences — detection is not a
 *    choice. The old screen-reader auto-detection probe is gone, as are the
 *    silent Alt+R / Alt+3 keyboard toggles that could switch modes on
 *    without the user ever opening the accessibility menu.
 * 3. EXPLICIT CHOICE PERSISTS EXACTLY. Every change a user makes is saved
 *    under their scope immediately (including an explicit all-off record),
 *    restored on their next sign-in, and invisible to every other account.
 *    Sign-out resets the visible state to defaults.
 */
export const A11Y_STORAGE_PREFIX = 'a11y.v2.';
export const a11yStorageKey = (scope: string) => `${A11Y_STORAGE_PREFIX}${scope}`;

const LEGACY_KEYS = [
  'accessibility_high_contrast',
  'accessibility_large_text',
  'accessibility_reduced_motion',
  'accessibility_screen_reader',
  'accessibility_dyslexiafont',
  'accessibility_easy_reading',
  'accessibility_text_size',
  'accessibility-preferences',
];

export function parseA11yRecord(raw: string | null): AccessibilityRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const prefs = parsed.preferences ?? {};
    return {
      preferences: {
        highContrast: prefs.highContrast === true,
        largeText: prefs.largeText === true,
        reducedMotion: prefs.reducedMotion === true,
        screenReader: prefs.screenReader === true,
        dyslexiaFont: prefs.dyslexiaFont === true,
      },
      easyReading: parsed.easyReading === true,
      textSize:
        typeof parsed.textSize === 'number' && parsed.textSize >= 0.8 && parsed.textSize <= 1.5
          ? parsed.textSize
          : 1,
    };
  } catch {
    return null;
  }
}

const loadLocalRecord = (scope: string): AccessibilityRecord =>
  parseA11yRecord(safeLocalGet(a11yStorageKey(scope))) ?? { ...DEFAULT_A11Y_RECORD, preferences: { ...DEFAULT_PREFERENCES } };

const detectSystemPreferences = (): SystemPreferences => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return { reducedMotion: false, highContrast: false };
  }
  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    highContrast:
      window.matchMedia('(prefers-contrast: more)').matches ||
      window.matchMedia('(prefers-contrast: high)').matches,
  };
};

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [record, setRecord] = useState<AccessibilityRecord>(() => loadLocalRecord('guest'));
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [systemPreferences, setSystemPreferences] = useState<SystemPreferences>(detectSystemPreferences);
  const scopeRef = useRef<string>('guest');
  // After an explicit sign-out, show defaults — do not resurrect a guest
  // record left by an earlier signed-out session on this browser.
  const suppressGuestRecordRef = useRef(false);

  const { preferences } = record;
  const isEasyReadingEnabled = record.easyReading;
  const textSize = record.textSize;
  const isScreenReaderEnabled = preferences.screenReader;

  // One-time cleanup of the leaky pre-fix global keys. They are deleted,
  // never read into any account (their owner is unknowable).
  useEffect(() => {
    LEGACY_KEYS.forEach((key) => safeLocalRemove(key));
  }, []);

  // Track OS preference changes for display purposes only.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const update = () => setSystemPreferences(detectSystemPreferences());
    const queries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-contrast: more)'),
    ];
    queries.forEach((q) => q.addEventListener?.('change', update));
    return () => queries.forEach((q) => q.removeEventListener?.('change', update));
  }, []);

  const persistRecord = useCallback((scope: string, next: AccessibilityRecord) => {
    safeLocalSet(a11yStorageKey(scope), JSON.stringify(next));
    if (scope !== 'guest') {
      // Best-effort server mirror so the choice follows the account.
      // Column-scoped upsert: touches only this feature's fields on the
      // user's single user_settings row.
      void (async () => {
        try {
          await supabase
            .from('user_settings' as never)
            .upsert(
              {
                user_id: scope,
                setting_key: 'accessibility_preferences',
                value: next,
                accessibility_mode: next.easyReading,
              } as never,
              { onConflict: 'user_id' } as never,
            );
        } catch {
          /* local record remains the fallback; never block the toggle */
        }
      })();
    }
  }, []);

  const applyRecord = useCallback(
    (next: AccessibilityRecord, persist: boolean) => {
      setRecord(next);
      if (persist) persistRecord(scopeRef.current, next);
    },
    [persistRecord],
  );

  // Follow the signed-in account: load ITS record, reset on sign-out.
  useEffect(() => {
    let cancelled = false;
    // Auth events are authoritative and arrive after getSession resolves;
    // a late getSession(null) must never clobber a scope an event just set.
    let authEventSeen = false;
    let activationSeq = 0;

    const activateScope = async (userId: string | null) => {
      const scope = userId ?? 'guest';
      if (scope === scopeRef.current && userId !== null) return;
      const seq = ++activationSeq;
      scopeRef.current = scope;

      if (!userId) {
        if (suppressGuestRecordRef.current) {
          setRecord({ ...DEFAULT_A11Y_RECORD, preferences: { ...DEFAULT_PREFERENCES } });
        } else {
          setRecord(loadLocalRecord('guest'));
        }
        return;
      }

      // Local record first (instant), then the server copy wins when the
      // account has one — it is the cross-device source of truth.
      setRecord(loadLocalRecord(scope));
      try {
        const { data } = await supabase
          .from('user_settings' as never)
          .select('setting_key, value' as never)
          .eq('user_id' as never, userId as never)
          .maybeSingle();
        if (cancelled || seq !== activationSeq || scopeRef.current !== scope) return;
        const row = data as { setting_key?: string; value?: unknown } | null;
        if (row && row.setting_key === 'accessibility_preferences' && row.value) {
          const serverRecord = parseA11yRecord(JSON.stringify(row.value));
          if (serverRecord) {
            setRecord(serverRecord);
            safeLocalSet(a11yStorageKey(scope), JSON.stringify(serverRecord));
          }
        }
      } catch {
        /* local record stands */
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && !authEventSeen) void activateScope(data.session?.user?.id ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      authEventSeen = true;
      if (event === 'SIGNED_OUT') {
        suppressGuestRecordRef.current = true;
        scopeRef.current = 'guest';
        setRecord({ ...DEFAULT_A11Y_RECORD, preferences: { ...DEFAULT_PREFERENCES } });
        return;
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        suppressGuestRecordRef.current = false;
        void activateScope(session?.user?.id ?? null);
      }
    });
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Apply preferences to the document root. Classes are the single source
  // of truth; every preference has a real effect here.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('a11y-high-contrast', preferences.highContrast);
    root.classList.toggle('a11y-large-text', preferences.largeText);
    root.classList.toggle('a11y-reduced-motion', preferences.reducedMotion);
    root.classList.toggle('a11y-dyslexia', preferences.dyslexiaFont);
    root.classList.toggle('easy-reading', record.easyReading);
    root.style.fontSize = `${Math.round(record.textSize * 100)}%`;

    // OpenDyslexic (SIL Open Font License, open source) loads on demand only
    // when the user enables the dyslexia-friendly font — never otherwise.
    const FONT_LINK_ID = 'a11y-dyslexia-font';
    if (preferences.dyslexiaFont && !document.getElementById(FONT_LINK_ID)) {
      const link = document.createElement('link');
      link.id = FONT_LINK_ID;
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@5.3.0/index.css';
      document.head.appendChild(link);
    } else if (!preferences.dyslexiaFont) {
      document.getElementById(FONT_LINK_ID)?.remove();
    }
  }, [preferences, record.easyReading, record.textSize]);

  // Easy-reading companion styles (spacing + touch targets).
  useEffect(() => {
    if (!record.easyReading) return;
    const style = document.createElement('style');
    style.id = 'easy-reading-styles';
    style.textContent = `
      .easy-reading {
        --letter-spacing: 0.03em;
        --line-height: 1.6;
      }
      .easy-reading p,
      .easy-reading span,
      .easy-reading div,
      .easy-reading button {
        letter-spacing: var(--letter-spacing);
        line-height: var(--line-height);
      }
      .easy-reading button,
      .easy-reading a {
        min-height: 48px;
        min-width: 48px;
      }
      .easy-reading input,
      .easy-reading select,
      .easy-reading textarea {
        font-size: 1.1em;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.getElementById('easy-reading-styles')?.remove();
    };
  }, [record.easyReading]);

  const updatePreferences = useCallback(
    (newPrefs: Partial<AccessibilityPreferences>) => {
      setRecord((prev) => {
        const next = { ...prev, preferences: { ...prev.preferences, ...newPrefs } };
        persistRecord(scopeRef.current, next);
        return next;
      });
    },
    [persistRecord],
  );

  const setScreenReaderEnabled = useCallback(
    (enabled: boolean) => updatePreferences({ screenReader: enabled }),
    [updatePreferences],
  );

  const setTextSize = useCallback(
    (size: number) => {
      setRecord((prev) => {
        const next = { ...prev, textSize: Math.round(Math.min(1.5, Math.max(0.8, size)) * 100) / 100 };
        persistRecord(scopeRef.current, next);
        return next;
      });
    },
    [persistRecord],
  );

  const increaseTextSize = useCallback(() => setTextSize(record.textSize + 0.1), [record.textSize, setTextSize]);
  const decreaseTextSize = useCallback(() => setTextSize(record.textSize - 0.1), [record.textSize, setTextSize]);
  const resetTextSize = useCallback(() => setTextSize(1), [setTextSize]);

  const enableEasyReading = useCallback(() => {
    setRecord((prev) => {
      const next = { ...prev, easyReading: true };
      persistRecord(scopeRef.current, next);
      return next;
    });
  }, [persistRecord]);

  const disableEasyReading = useCallback(() => {
    setRecord((prev) => {
      const next = { ...prev, easyReading: false };
      persistRecord(scopeRef.current, next);
      return next;
    });
  }, [persistRecord]);

  const resetAllAccessibility = useCallback(() => {
    const next = { ...DEFAULT_A11Y_RECORD, preferences: { ...DEFAULT_PREFERENCES } };
    applyRecord(next, true);
  }, [applyRecord]);

  const speakContent = useCallback((message: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Announcements always reach assistive tech via the aria-live region;
  // they are SPOKEN aloud only when the user has screen reader mode on.
  const screenReaderAnnounce = useCallback(
    (message: string, assertive = true) => {
      const announcement = document.createElement('div');
      announcement.className = 'sr-only';
      announcement.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
      document.body.appendChild(announcement);
      setTimeout(() => {
        announcement.textContent = message;
      }, 100);
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
      if (preferences.screenReader) speakContent(message);
    },
    [preferences.screenReader, speakContent],
  );

  const skipToContent = useCallback(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.tabIndex = -1;
      mainContent.focus();
      screenReaderAnnounce('Skipped to main content');
    }
  }, [screenReaderAnnounce]);

  // Keyboard shortcuts — navigation and text size only. Mode toggles were
  // removed: Alt+R / Alt+3 used to switch Easy Reading / screen reader
  // mode on silently and persist it, one way the feature "turned itself
  // on". Modes now change only from the accessibility menu or Settings.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        skipToContent();
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        screenReaderAnnounce(
          'Keyboard shortcuts: Alt+1 to skip to main content, Alt+2 for this help, Alt plus and Alt minus for text size. Accessibility modes are changed in the accessibility menu.',
          true,
        );
      }
      if (e.key === 'Escape' && isSpeaking) {
        e.preventDefault();
        stopSpeaking();
      }
      if (e.altKey && e.key === '=') {
        e.preventDefault();
        increaseTextSize();
        screenReaderAnnounce('Text size increased', false);
      }
      if (e.altKey && e.key === '-') {
        e.preventDefault();
        decreaseTextSize();
        screenReaderAnnounce('Text size decreased', false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [skipToContent, screenReaderAnnounce, isSpeaking, stopSpeaking, increaseTextSize, decreaseTextSize]);

  return (
    <AccessibilityContext.Provider
      value={{
        screenReaderAnnounce,
        skipToContent,
        isScreenReaderEnabled,
        setScreenReaderEnabled,
        speakContent,
        isSpeaking,
        stopSpeaking,
        increaseTextSize,
        decreaseTextSize,
        resetTextSize,
        textSize,
        enableEasyReading,
        disableEasyReading,
        isEasyReadingEnabled,
        preferences,
        updatePreferences,
        resetAllAccessibility,
        systemPreferences,
      }}
    >
      {/* Skip to content link - visible on focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:left-0 focus:top-0 focus:w-auto focus:h-auto"
        onClick={(e) => {
          e.preventDefault();
          skipToContent();
        }}
      >
        Skip to content
      </a>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
