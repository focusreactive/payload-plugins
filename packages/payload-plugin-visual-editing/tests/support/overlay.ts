import { vi } from "vitest";

import type { OverlayCtx } from "../../src/client/createOverlay";

import { ADMIN_ORIGIN } from "./previewWindow";

export const overlayCtx = (overrides: Partial<OverlayCtx> = {}): OverlayCtx => ({
  adminBasePath: "/admin",
  adminOrigin: ADMIN_ORIGIN,
  buildAdminEditUrl: vi.fn(() => "/admin/edit"),
  mode: "always",
  ...overrides,
});

export const click = (element: Element, init: MouseEventInit = {}): MouseEvent => {
  const event = new MouseEvent("click", { bubbles: true, button: 0, cancelable: true, ...init });
  element.dispatchEvent(event);
  return event;
};
