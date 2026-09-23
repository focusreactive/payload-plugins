"use client";

import React, { createContext, use, useEffect, useState } from "react";

import canUseDOM from "@/lib/utils/canUseDOM";

import { defaultTheme, themeLocalStorageKey } from "./consts";
import type { Theme, ThemeContextType } from "./types";

const initialContext: ThemeContextType = {
  setTheme: () => null,
  theme: undefined,
};

const ThemeContext = createContext(initialContext);

/**
 * The document decides, and the server sets it: `layout.tsx` renders `data-theme="light"` and
 * nothing here overrides that on mount. A section that wants a dark treatment carries its own
 * `data-theme`, which is why the site never needs a document-level switch.
 *
 * Two things this provider deliberately does NOT do, because each one darkened the whole site:
 *
 *   - read `prefers-color-scheme`. It used to, so every visitor whose machine was in dark mode got
 *     the dark palette a moment after the light one painted. The design has no dark state.
 *   - read `localStorage` on mount. The key is `payload-theme`, which belongs to the Payload admin,
 *     so an editor who set a dark admin panel also darkened the public pages.
 *
 * `setTheme` remains for an explicit, deliberate choice and keeps the document and the context in
 * step. Passing `null` resets to the site's own default rather than to the machine's preference.
 */
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme | undefined>(
    canUseDOM ? (document.documentElement.dataset.theme as Theme) : undefined
  );

  const setTheme = (themeToSet: Theme | null) => {
    const resolved = themeToSet ?? defaultTheme;

    if (themeToSet === null) {
      window.localStorage.removeItem(themeLocalStorageKey);
    } else {
      window.localStorage.setItem(themeLocalStorageKey, themeToSet);
    }

    document.documentElement.dataset.theme = resolved;
    setThemeState(resolved);
  };

  useEffect(() => {
    setThemeState((document.documentElement.dataset.theme as Theme) ?? defaultTheme);
  }, []);

  return <ThemeContext value={{ setTheme, theme }}>{children}</ThemeContext>;
};

export const useTheme = (): ThemeContextType => use(ThemeContext);
