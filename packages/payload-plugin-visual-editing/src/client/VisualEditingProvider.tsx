"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { VisualEditingMode } from "./visualEditingMode.js";
import { STORAGE_KEY } from "./visualEditingMode.js";
import { defaultBuildAdminEditUrl } from "../shared/buildAdminEditUrl.js";
import type { BuildAdminEditUrl } from "../shared/buildAdminEditUrl.js";

type VisualEditingContextType = {
  available: boolean;
  enabled: boolean;
  instantPreview: boolean;
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
  instantPreview: false,
  mode: "off",
  setMode: noop,
  toggleEnabled: noop,
  buildAdminEditUrl: defaultBuildAdminEditUrl,
  adminOrigin: "",
  adminBasePath: "/admin",
});

function readStoredMode(): VisualEditingMode {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "always" || raw === "hover" || raw === "off") return raw;
  if (raw === "true") return "always";
  return "off";
}

export function VisualEditingProvider({
  available: availableProp = false,
  framedOnly = false,
  instantPreview = false,
  buildAdminEditUrl = defaultBuildAdminEditUrl,
  adminOrigin,
  adminBasePath = "/admin",
  children,
}: {
  available?: boolean;
  /** Restrict the overlay to the CMS preview iframe — hidden when opened in a standalone tab. */
  framedOnly?: boolean;
  instantPreview?: boolean;
  buildAdminEditUrl?: BuildAdminEditUrl;
  adminOrigin?: string;
  adminBasePath?: string;
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<VisualEditingMode>("off");
  const [resolvedOrigin, setResolvedOrigin] = useState(adminOrigin ?? "");
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
      instantPreview,
      mode,
      setMode,
      toggleEnabled,
      buildAdminEditUrl,
      adminOrigin: resolvedOrigin,
      adminBasePath,
    }),
    [available, enabled, instantPreview, mode, buildAdminEditUrl, resolvedOrigin, adminBasePath]
  );

  return <VisualEditingContext.Provider value={value}>{children}</VisualEditingContext.Provider>;
}

export const useVisualEditing = () => useContext(VisualEditingContext);
