"use client";

import React, { createContext, use, useEffect, useState } from "react";

import canUseDOM from "@/core/lib/canUseDOM";

import { defaultTheme, themeLocalStorageKey } from "./consts";
import type { Theme, ThemeContextType } from "./types";
import { getImplicitPreference, themeIsValid } from "./utils";

const initialContext: ThemeContextType = {
  setTheme: () => null,
  theme: undefined,
};

const ThemeContext = createContext(initialContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme | undefined>(
    canUseDOM
      ? (document.documentElement.dataset.theme as Theme)
      : undefined
  );

  const setTheme = (themeToSet: Theme | null) => {
    if (themeToSet === null) {
      window.localStorage.removeItem(themeLocalStorageKey);
      const implicitPreference = getImplicitPreference();
      document.documentElement.dataset.theme = implicitPreference || "";
      if (implicitPreference) {setThemeState(implicitPreference);}
    } else {
      setThemeState(themeToSet);
      window.localStorage.setItem(themeLocalStorageKey, themeToSet);
      document.documentElement.dataset.theme = themeToSet;
    }
  };

  useEffect(() => {
    let themeToSet: Theme = defaultTheme;
    const preference = window.localStorage.getItem(themeLocalStorageKey);

    if (themeIsValid(preference)) {
      themeToSet = preference;
    } else {
      const implicitPreference = getImplicitPreference();

      if (implicitPreference) {
        themeToSet = implicitPreference;
      }
    }

    document.documentElement.dataset.theme = themeToSet;
    setThemeState(themeToSet);
  }, []);

  return <ThemeContext value={{ setTheme, theme }}>{children}</ThemeContext>;
};

export const useTheme = (): ThemeContextType => use(ThemeContext);
