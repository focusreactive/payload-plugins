import type { BuildAdminEditUrl } from "../shared/buildAdminEditUrl.js";
import type { VisualEditingMode } from "./visualEditingMode.js";

import { defaultBuildAdminEditUrl } from "../shared/buildAdminEditUrl.js";
import { findAdminWindow } from "./adminWindow.js";
import { STORAGE_KEY } from "./visualEditingMode.js";

export type SessionOptions = {
  available?: boolean;
  framedOnly?: boolean;
  instantPreview?: boolean;
  buildAdminEditUrl?: BuildAdminEditUrl;
  adminOrigin?: string;
  adminBasePath?: string;
};

export type Session = {
  available: boolean;
  isDraft: boolean;
  enabled: boolean;
  instantPreview: boolean;
  isInstantPreviewOn: boolean;
  mode: VisualEditingMode;
  buildAdminEditUrl: BuildAdminEditUrl;
  adminOrigin: string;
  adminBasePath: string;
};

export type PageState = { mode: VisualEditingMode; isFramed: boolean; pageOrigin: string };

export interface PageStore {
  read(): PageState;
  subscribe(listener: () => void): () => void;
  attach(win: Window): void;
  setMode(mode: VisualEditingMode): void;
}

export const DETACHED_PAGE: PageState = { isFramed: false, mode: "off", pageOrigin: "" };

const DEFAULT_ADMIN_BASE_PATH = "/admin";

const DEFAULT_API_PATH = "/api";

const WEB_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);

const originOf = (adminOrigin: string | undefined): string | undefined => {
  if (!adminOrigin) return undefined;
  try {
    const { origin, protocol } = new URL(adminOrigin);
    return WEB_PROTOCOLS.has(protocol) ? origin : undefined;
  } catch {
    return undefined;
  }
};

export const payloadApiOf = ({
  adminOrigin,
  payloadApi,
}: {
  adminOrigin?: string;
  payloadApi?: string;
}): string | undefined => {
  if (payloadApi !== undefined) return payloadApi;
  const origin = originOf(adminOrigin);
  return origin && new URL(DEFAULT_API_PATH, origin).href;
};

const storedModeOf = (win: Window): string | null => {
  try {
    return win.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const readStoredMode = (win: Window): VisualEditingMode => {
  const stored = storedModeOf(win);
  if (stored === "always" || stored === "hover" || stored === "off") return stored;
  if (stored === "true") return "always";
  return "off";
};

const storeMode = (win: Window, mode: VisualEditingMode): void => {
  try {
    win.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    return;
  }
};

export const toggledMode = (mode: VisualEditingMode): VisualEditingMode =>
  mode === "off" ? "always" : "off";

export function createPageStore(): PageStore {
  const listeners = new Set<() => void>();
  let state = DETACHED_PAGE;
  let attachedWindow: Window | null = null;

  const change = (next: PageState) => {
    state = next;
    for (const listener of listeners) listener();
  };

  return {
    read: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    attach(win) {
      attachedWindow = win;
      change({
        isFramed: win.self !== win.top || findAdminWindow(win) !== null,
        mode: readStoredMode(win),
        pageOrigin: win.location.origin,
      });
    },
    setMode(mode) {
      change({ ...state, mode });
      if (attachedWindow) storeMode(attachedWindow, mode);
    },
  };
}

export const sessionOf = (options: SessionOptions, page: PageState): Session => {
  const isDraft = Boolean(options.available);
  const available = isDraft && (!options.framedOnly || page.isFramed);
  const instantPreview = options.instantPreview ?? true;
  return {
    adminBasePath: options.adminBasePath ?? DEFAULT_ADMIN_BASE_PATH,
    adminOrigin: originOf(options.adminOrigin) ?? page.pageOrigin,
    available,
    buildAdminEditUrl: options.buildAdminEditUrl ?? defaultBuildAdminEditUrl,
    enabled: available && page.mode !== "off",
    instantPreview,
    isDraft,
    isInstantPreviewOn: available && instantPreview,
    mode: page.mode,
  };
};
