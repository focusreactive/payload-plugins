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

const readStoredMode = (storage: Storage): VisualEditingMode => {
  const stored = storage.getItem(STORAGE_KEY);
  if (stored === "always" || stored === "hover" || stored === "off") return stored;
  if (stored === "true") return "always";
  return "off";
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
        mode: readStoredMode(win.localStorage),
        pageOrigin: win.location.origin,
      });
    },
    setMode(mode) {
      change({ ...state, mode });
      attachedWindow?.localStorage.setItem(STORAGE_KEY, mode);
    },
  };
}

export const sessionOf = (options: SessionOptions, page: PageState): Session => {
  const isDraft = Boolean(options.available);
  const available = isDraft && (!options.framedOnly || page.isFramed);
  return {
    adminBasePath: options.adminBasePath ?? DEFAULT_ADMIN_BASE_PATH,
    adminOrigin: options.adminOrigin || page.pageOrigin,
    available,
    buildAdminEditUrl: options.buildAdminEditUrl ?? defaultBuildAdminEditUrl,
    enabled: available && page.mode !== "off",
    instantPreview: Boolean(options.instantPreview),
    isDraft,
    mode: page.mode,
  };
};
