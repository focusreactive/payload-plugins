// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildOverlayClickHandler } from "../src/client/overlayClickHandler";
import type { OverlayClickContext } from "../src/client/overlayClickHandler";
import { VE_MESSAGE_TYPE } from "../src/constants";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("overlay click handler", () => {
  const ctx: OverlayClickContext = {
    path: "hero.title",
    docId: "p-1",
    collectionSlug: "pages",
    kind: "collection",
    href: "/admin/collections/pages/p-1?veFocus=hero.title",
    adminOrigin: "http://localhost:3000",
  };

  it("posts to parent when inside iframe", () => {
    const postMessage = vi.fn();
    const parent = { postMessage };
    const win = {
      parent,
      opener: null,
      open: vi.fn(),
      location: { origin: "http://localhost:3000" },
    } as unknown as Window;
    (win as any).self = win;

    const handler = buildOverlayClickHandler(ctx, win);
    const event = { preventDefault: vi.fn() } as unknown as MouseEvent;
    handler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: VE_MESSAGE_TYPE, path: "hero.title", docId: "p-1" }),
      "http://localhost:3000"
    );
  });

  it("posts to opener when opener is present and not iframe", () => {
    const postMessage = vi.fn();
    const opener = { postMessage, closed: false };
    const win = {
      parent: undefined,
      opener,
      open: vi.fn(),
      location: { origin: "http://localhost:3000" },
    } as unknown as Window;
    (win as any).self = win;
    (win as any).parent = win; // parent === self means not iframe

    const handler = buildOverlayClickHandler(ctx, win);
    handler({ preventDefault: vi.fn() } as unknown as MouseEvent);
    expect(postMessage).toHaveBeenCalled();
  });

  it("opens new tab when no parent and no opener", () => {
    const open = vi.fn();
    const win = {
      parent: undefined,
      opener: null,
      open,
      location: { origin: "http://localhost:3000" },
    } as unknown as Window;
    (win as any).self = win;
    (win as any).parent = win;

    const handler = buildOverlayClickHandler(ctx, win);
    handler({ preventDefault: vi.fn() } as unknown as MouseEvent);
    expect(open).toHaveBeenCalledWith(ctx.href, "_blank");
  });
});
