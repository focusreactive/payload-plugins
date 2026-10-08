"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { STORAGE_KEY } from "../constants.js";
import type { VisualEditingMode } from "../constants.js";
import { defaultBuildAdminEditUrl } from "./buildAdminEditUrl.js";
import type { BuildAdminEditUrl } from "./buildAdminEditUrl.js";

type VisualEditingContextType = {
  available: boolean;
  enabled: boolean;
  mode: VisualEditingMode;
  setMode: (mode: VisualEditingMode) => void;
  toggleEnabled: () => void;
  buildAdminEditUrl: BuildAdminEditUrl;
  adminOrigin: string;
  adminBasePath: string;
};

const noop = (): void => undefined;

const VisualEditingContext = createContext<VisualEditingContextType>({
  available: false,
  enabled: false,
  mode: "off",
  setMode: noop,
  toggleEnabled: noop,
  buildAdminEditUrl: defaultBuildAdminEditUrl,
  adminOrigin: "",
  adminBasePath: "/admin",
});

// Pre-3-state builds persisted `'true'` / `'false'` — promote them so existing
// users keep their enabled state across this change.
function readStoredMode(): VisualEditingMode {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "always" || raw === "hover" || raw === "off") return raw;
  if (raw === "true") return "always";
  return "off";
}

export function VisualEditingProvider({
  available: availableProp = false,
  framedOnly = false,
  buildAdminEditUrl = defaultBuildAdminEditUrl,
  adminOrigin,
  adminBasePath = "/admin",
  children,
}: {
  available?: boolean;
  /** Restrict the overlay to the CMS preview iframe — hidden when opened in a standalone tab. */
  framedOnly?: boolean;
  buildAdminEditUrl?: BuildAdminEditUrl;
  adminOrigin?: string;
  adminBasePath?: string;
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<VisualEditingMode>("off");
  const [resolvedOrigin, setResolvedOrigin] = useState(adminOrigin ?? "");
  // The CMS side preview renders us in an iframe; a separate tab is top-level.
  const [isFramed, setIsFramed] = useState(false);

  useEffect(() => {
    setModeState(readStoredMode());
    setIsFramed(window.self !== window.top);
    if (!adminOrigin) setResolvedOrigin(window.location.origin);
  }, [adminOrigin]);

  const setMode = (next: VisualEditingMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const toggleEnabled = () => setMode(mode === "off" ? "always" : "off");

  const available = availableProp && (!framedOnly || isFramed);
  const enabled = available && mode !== "off";

  const value = useMemo(
    () => ({
      available,
      enabled,
      mode,
      setMode,
      toggleEnabled,
      buildAdminEditUrl,
      adminOrigin: resolvedOrigin,
      adminBasePath,
    }),
    [available, enabled, mode, buildAdminEditUrl, resolvedOrigin, adminBasePath]
  );

  return <VisualEditingContext.Provider value={value}>{children}</VisualEditingContext.Provider>;
}

export const useVisualEditing = () => useContext(VisualEditingContext);
