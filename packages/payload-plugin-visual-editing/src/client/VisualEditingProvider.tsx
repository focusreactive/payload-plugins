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

import type { BuildAdminEditUrl } from "../shared/buildAdminEditUrl.js";
import type { PayloadValues } from "./instantPreview/unsavedRender/renderValue.js";
import type { Session } from "./session.js";
import type { VisualEditingMode } from "./visualEditingMode.js";

import { listenToPayloadValues } from "./instantPreview/unsavedRender/renderValue.js";
import { createPageStore, DETACHED_PAGE, payloadApiOf, sessionOf, toggledMode } from "./session.js";
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

const PayloadValuesContext = createContext<PayloadValues | null>(null);

const readDetachedPage = () => DETACHED_PAGE;

export function VisualEditingProvider({
  available = false,
  framedOnly = false,
  instantPreview = true,
  buildAdminEditUrl,
  adminOrigin,
  adminBasePath,
  payloadApi: namedPayloadApi,
  children,
}: {
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
  const [payloadValues, setPayloadValues] = useState<PayloadValues | null>(null);
  const latestAdminOrigin = useRef(value.adminOrigin);
  const isInstantPreviewOn = value.available && value.instantPreview;

  useIsomorphicLayoutEffect(() => {
    latestAdminOrigin.current = value.adminOrigin;
  });

  useIsomorphicLayoutEffect(() => {
    if (!isInstantPreviewOn || !payloadApi) return;
    const listening = listenToPayloadValues(() => latestAdminOrigin.current, payloadApi);
    setPayloadValues(listening);
    return () => {
      listening.stop();
      setPayloadValues(null);
    };
  }, [isInstantPreviewOn, payloadApi]);

  return (
    <VisualEditingContext.Provider value={value}>
      <PayloadValuesContext.Provider value={payloadValues}>
        {children}
      </PayloadValuesContext.Provider>
    </VisualEditingContext.Provider>
  );
}

export const useVisualEditing = () => useContext(VisualEditingContext);

export const usePayloadValues = () => useContext(PayloadValuesContext);
