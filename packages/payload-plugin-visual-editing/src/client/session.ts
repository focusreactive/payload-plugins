import type { BuildAdminEditUrl } from "../shared/buildAdminEditUrl.js";
import type { VisualEditingMode } from "./visualEditingMode.js";

import { defaultBuildAdminEditUrl } from "../shared/buildAdminEditUrl.js";
import { findAdminWindow } from "./adminWindow.js";
import { STORAGE_KEY } from "./visualEditingMode.js";

export type SessionOptions = {
  available?: boolean;
  framedOnly?: boolean;
  instantPreview?: boolean;
  inlineEditing?: boolean;
  buildAdminEditUrl?: BuildAdminEditUrl;
  adminOrigin?: string;
  adminBasePath?: string;
  payloadApi?: string;
};

export type Session = {
  available: boolean;
  isDraft: boolean;
  enabled: boolean;
  instantPreview: boolean;
  isInstantPreviewOn: boolean;
  inlineEditing: boolean;
  isInlineEditingOn: boolean;
  mode: VisualEditingMode;
  buildAdminEditUrl: BuildAdminEditUrl;
  adminOrigin: string;
  adminBasePath: string;
  payloadApi: string;
};

export type PageState = {
  chosenMode: VisualEditingMode | null;
  isFramed: boolean;
  pageOrigin: string;
};

export interface PageStore {
  read(): PageState;
  subscribe(listener: () => void): () => void;
  attach(win: Window): void;
  setMode(mode: VisualEditingMode): void;
}

export const DETACHED_PAGE: PageState = {
  chosenMode: "off",
  isFramed: false,
  pageOrigin: "",
};

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

const storedUnder = (win: Window, key: string): string | null => {
  try {
    return win.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const store = (win: Window, key: string, value: string): void => {
  try {
    win.localStorage.setItem(key, value);
  } catch {
    return;
  }
};

const readStoredMode = (win: Window): VisualEditingMode | null => {
  const stored = storedUnder(win, STORAGE_KEY);
  if (stored === "always" || stored === "hover" || stored === "off") return stored;
  if (stored === "true") return "always";
  return null;
};

const modeOf = (chosenMode: VisualEditingMode | null, inlineEditing: boolean): VisualEditingMode =>
  chosenMode ?? (inlineEditing ? "hover" : "off");

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
        chosenMode: readStoredMode(win),
        isFramed: win.self !== win.top || findAdminWindow(win) !== null,
        pageOrigin: win.location.origin,
      });
    },
    setMode(mode) {
      change({ ...state, chosenMode: mode });
      if (attachedWindow) store(attachedWindow, STORAGE_KEY, mode);
    },
  };
}

export const sessionOf = (options: SessionOptions, page: PageState): Session => {
  const isDraft = Boolean(options.available);
  const available = isDraft && (!options.framedOnly || page.isFramed);
  const instantPreview = options.instantPreview ?? true;
  const adminOrigin = originOf(options.adminOrigin) ?? page.pageOrigin;
  const inlineEditing = available && Boolean(options.inlineEditing);
  const mode = modeOf(page.chosenMode, inlineEditing);
  const enabled = available && mode !== "off";
  return {
    adminBasePath: options.adminBasePath ?? DEFAULT_ADMIN_BASE_PATH,
    adminOrigin,
    available,
    buildAdminEditUrl: options.buildAdminEditUrl ?? defaultBuildAdminEditUrl,
    enabled,
    inlineEditing,
    instantPreview,
    isDraft,
    isInlineEditingOn: enabled && inlineEditing,
    isInstantPreviewOn: available && instantPreview,
    mode,
    payloadApi: options.payloadApi ?? `${adminOrigin}${DEFAULT_API_PATH}`,
  };
};
