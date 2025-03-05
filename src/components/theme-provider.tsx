
"use client";

import { createContext, useEffect, useState } from "react";

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

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  enableSystem = true,
  disableTransitionOnChange = false,
  attribute = "data-theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
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
  }, [theme, disableTransitionOnChange, enableSystem, attribute]);

  useEffect(() => {
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
  }, [theme, enableSystem, attribute]);

  useEffect(() => {
    // Force refresh theme on initial load
    const root = window.document.documentElement;
    const currentTheme = theme === "system" && enableSystem
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : theme;
      
    root.classList.remove("light", "dark");
    root.classList.add(currentTheme);
    root.setAttribute(attribute, currentTheme);
  }, []);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme);
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
