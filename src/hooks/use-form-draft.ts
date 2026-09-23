import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Persist a long form's draft to localStorage so it survives reloads and
 * the login redirect (Spotify/Google pattern for forms: your half-filled
 * application is still here when you get back).
 *
 * - Restores once on mount (with an opt-in toast when real content returns).
 * - Persists on every change once the form is non-pristine.
 * - Call `clearDraft()` after successful submit.
 */
export function useFormDraft<T extends Record<string, unknown>>(
  storageKey: string,
  initial: T,
  options?: { restoreToast?: string }
) {
  const [draft, setDraft] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return initial;
      const parsed = JSON.parse(raw) as Partial<T>;
      return { ...initial, ...parsed };
    } catch {
      return initial;
    }
  });
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<T>;
      // Real user content = a primitive that differs from its initial value
      // or a non-empty array (nested default objects don't count).
      const hasContent = Object.entries(parsed).some(([k, v]) => {
        const init = (initial as Record<string, unknown>)[k];
        if (Array.isArray(v)) return v.length > 0;
        if (v !== null && typeof v === 'object') return false;
        return v !== undefined && v !== '' && v !== init;
      });
      if (hasContent) {
        setRestored(true);
        if (options?.restoreToast) toast.info(options.restoreToast);
      }
    } catch {
      // ignore — form starts fresh
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const pristine = Object.values(draft).every((v) =>
      Array.isArray(v) ? v.length === 0 : !v || v === ''
    );
    if (pristine && !restored) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      // storage unavailable — form still works for this session
    }
  }, [draft, restored, storageKey]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  return { draft, setDraft, restored, clearDraft };
}
