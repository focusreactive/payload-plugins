"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { BuildAdminEditUrl } from "../../shared/buildAdminEditUrl.js";
import type { AccentOptions } from "../accent.js";
import type { RenderSources } from "../instantPreview/unsavedRender/renderSources.js";
import type { Session } from "../session.js";
import type { VisualEditingMode } from "../visualEditingMode.js";

import { applyAccent } from "../accent.js";
import {
  listenToRenderSources,
  RENDER_SOURCES_OF_THE_PAGE_ALONE,
} from "../instantPreview/unsavedRender/renderSources.js";
import {
  createPageStore,
  DETACHED_PAGE,
  payloadApiOf,
  sessionOf,
  toggledMode,
} from "../session.js";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect.js";

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

const RenderSourcesContext = createContext<RenderSources>(RENDER_SOURCES_OF_THE_PAGE_ALONE);

const readDetachedPage = () => DETACHED_PAGE;

export function VisualEditingProvider({
  available = false,
  framedOnly = false,
  instantPreview = true,
  buildAdminEditUrl,
  adminOrigin,
  adminBasePath,
  payloadApi: namedPayloadApi,
  accentColor,
  accentTextColor,
  children,
}: AccentOptions & {
  available?: boolean;
  framedOnly?: boolean;
  instantPreview?: boolean;
  buildAdminEditUrl?: BuildAdminEditUrl;
  adminOrigin?: string;
  adminBasePath?: string;
  payloadApi?: string;
  children: React.ReactNode;
}) {
  const [pageStore] = useState(createPageStore);
  const page = useSyncExternalStore(pageStore.subscribe, pageStore.read, readDetachedPage);

  useEffect(() => {
    pageStore.attach(window);
  }, [pageStore]);

  useEffect(
    () => applyAccent(document, { accentColor, accentTextColor }),
    [accentColor, accentTextColor]
  );

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

  const payloadApi = payloadApiOf({ adminOrigin, payloadApi: namedPayloadApi });
  const [renderSources, setRenderSources] = useState(RENDER_SOURCES_OF_THE_PAGE_ALONE);
  const latestAdminOrigin = useRef(value.adminOrigin);
  const { isInstantPreviewOn } = value;

  useIsomorphicLayoutEffect(() => {
    latestAdminOrigin.current = value.adminOrigin;
  });

  useIsomorphicLayoutEffect(() => {
    if (!isInstantPreviewOn || !payloadApi) return;
    const listening = listenToRenderSources({
      adminOrigin: () => latestAdminOrigin.current,
      payloadApi,
    });
    setRenderSources(listening);
    return () => {
      listening.stop();
      setRenderSources(RENDER_SOURCES_OF_THE_PAGE_ALONE);
    };
  }, [isInstantPreviewOn, payloadApi]);

  return (
    <VisualEditingContext.Provider value={value}>
      <RenderSourcesContext.Provider value={renderSources}>
        {children}
      </RenderSourcesContext.Provider>
    </VisualEditingContext.Provider>
  );
}

export const useVisualEditing = () => useContext(VisualEditingContext);

export const useRenderSources = () => useContext(RenderSourcesContext);
