import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildOverlayClickHandler } from "../../src/client/overlayClickHandler";
import type { OverlayClickContext } from "../../src/client/overlayClickHandler";
import { VE_MESSAGE_TYPE } from "../../src/shared/protocol";

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

  it("posts to its own origin, never to any origin, when the admin origin is not known", () => {
    const postMessage = vi.fn();
    const win = {
      parent: { postMessage },
      opener: null,
      open: vi.fn(),
      location: { origin: "https://site.example" },
    } as unknown as Window;

    buildOverlayClickHandler(
      { ...ctx, adminOrigin: "" },
      win
    )({
      preventDefault: vi.fn(),
    } as unknown as MouseEvent);

    expect(postMessage).toHaveBeenCalledWith(expect.anything(), "https://site.example");
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
    Object.assign(win, { parent: win });

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
    Object.assign(win, { parent: win });

    const handler = buildOverlayClickHandler(ctx, win);
    handler({ preventDefault: vi.fn() } as unknown as MouseEvent);
    expect(open).toHaveBeenCalledWith(`http://localhost:3000${ctx.href}`, "_blank");
  });

  const openedWithoutAdminWindow = (context: OverlayClickContext) => {
    const open = vi.fn();
    const win = { opener: null, open, location: { origin: "https://site.example" } };
    Object.assign(win, { parent: win });

    buildOverlayClickHandler(
      context,
      win as unknown as Window
    )({ preventDefault: vi.fn() } as unknown as MouseEvent);
    return open.mock.calls[0]?.[0];
  };

  it("opens the field on the origin of the admin when the site runs on another one", () => {
    expect(openedWithoutAdminWindow({ ...ctx, adminOrigin: "https://cms.example" })).toBe(
      "https://cms.example/admin/collections/pages/p-1?veFocus=hero.title"
    );
  });

  it("keeps a link that names its own origin", () => {
    const href = "https://admin.example/edit/p-1";

    expect(openedWithoutAdminWindow({ ...ctx, adminOrigin: "https://cms.example", href })).toBe(
      href
    );
  });

  it("opens the link as it is when the admin origin is not known", () => {
    expect(openedWithoutAdminWindow({ ...ctx, adminOrigin: "" })).toBe(ctx.href);
  });
});
