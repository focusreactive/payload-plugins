"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import type { BuildAdminEditUrl } from "../shared/buildAdminEditUrl.js";
import type { Session } from "./session.js";
import type { VisualEditingMode } from "./visualEditingMode.js";

import { createPageStore, DETACHED_PAGE, sessionOf, toggledMode } from "./session.js";

type VisualEditingContextType = Session & {
  setMode: (mode: VisualEditingMode) => void;
  toggleEnabled: () => void;
};

const noop = (): void => undefined;

const VisualEditingContext = createContext<VisualEditingContextType>({
  ...sessionOf({}, DETACHED_PAGE),
  setMode: noop,
  toggleEnabled: noop,
});

const readDetachedPage = () => DETACHED_PAGE;

export function VisualEditingProvider({
  available = false,
  framedOnly = false,
  instantPreview = false,
  buildAdminEditUrl,
  adminOrigin,
  adminBasePath,
  children,
}: {
  available?: boolean;
  framedOnly?: boolean;
  instantPreview?: boolean;
  buildAdminEditUrl?: BuildAdminEditUrl;
  adminOrigin?: string;
  adminBasePath?: string;
  children: React.ReactNode;
}) {
  const [pageStore] = useState(createPageStore);
  const page = useSyncExternalStore(pageStore.subscribe, pageStore.read, readDetachedPage);

  useEffect(() => {
    pageStore.attach(window);
  }, [pageStore]);

  const value = useMemo((): VisualEditingContextType => {
    const session = sessionOf(
      { adminBasePath, adminOrigin, available, buildAdminEditUrl, framedOnly, instantPreview },
      page
    );
    return {
      ...session,
      setMode: pageStore.setMode,
      toggleEnabled: () => pageStore.setMode(toggledMode(session.mode)),
    };
  }, [
    adminBasePath,
    adminOrigin,
    available,
    buildAdminEditUrl,
    framedOnly,
    instantPreview,
    page,
    pageStore,
  ]);

  return <VisualEditingContext.Provider value={value}>{children}</VisualEditingContext.Provider>;
}

export const useVisualEditing = () => useContext(VisualEditingContext);
