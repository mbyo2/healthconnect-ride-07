
"use client";

import * as React from "react";
import { safeLocalGet, safeLocalSet } from '@/utils/storage';

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  attribute?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

export const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  enableSystem = true,
  disableTransitionOnChange = false,
  attribute = "data-theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(() => {
    try {
      return (safeLocalGet(storageKey) as Theme) || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  React.useEffect(() => {
    try {
      const root = window.document.documentElement;

      if (theme === "system" && enableSystem) {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

        root.classList.remove("light", "dark");
        root.classList.add(systemTheme);
        root.setAttribute(attribute, systemTheme);
        return;
      }

      if (disableTransitionOnChange) {
        root.classList.add("[&_*]:!transition-none");
        window.setTimeout(() => {
          root.classList.remove("[&_*]:!transition-none");
        }, 0);
      }

      root.classList.remove("light", "dark");
      root.classList.add(theme);
      root.setAttribute(attribute, theme);
    } catch (error) {
      console.warn('Theme application failed:', error);
    }
  }, [theme, disableTransitionOnChange, enableSystem, attribute]);

  React.useEffect(() => {
    try {
      const handleMediaChange = (e: MediaQueryListEvent) => {
        if (theme === "system" && enableSystem) {
          const root = window.document.documentElement;
          const systemTheme = e.matches ? "dark" : "light";

          root.classList.remove("light", "dark");
          root.classList.add(systemTheme);
          root.setAttribute(attribute, systemTheme);
        }
      };

      const media = window.matchMedia("(prefers-color-scheme: dark)");
      media.addEventListener("change", handleMediaChange);

      return () => media.removeEventListener("change", handleMediaChange);
    } catch (error) {
      console.warn('Media query listener failed:', error);
    }
  }, [theme, enableSystem, attribute]);

  React.useEffect(() => {
    try {
      // Force refresh theme on initial load
      const root = window.document.documentElement;
      const currentTheme = theme === "system" && enableSystem
        ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        : theme;
        
      root.classList.remove("light", "dark");
      root.classList.add(currentTheme);
      root.setAttribute(attribute, currentTheme);
    } catch (error) {
      console.warn('Initial theme setup failed:', error);
    }
  }, []);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
        safeLocalSet(storageKey, newTheme);
        setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export { ThemeProviderContext as ThemeContext };
