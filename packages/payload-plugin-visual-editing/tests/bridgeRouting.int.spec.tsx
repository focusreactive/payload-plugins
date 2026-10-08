// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VisualEditingBridgeProvider } from "../src/admin/VisualEditingBridgeProvider";
import { VE_MESSAGE_TYPE } from "../src/constants";
import type { VeOpenFieldMessage } from "../src/constants";

// `@payloadcms/ui` ships CSS that vitest can't resolve. The bridge only uses
// `useConfig` to get `getEntityConfig`; stub it so the resolver falls back to
// path-only behavior and routing logic is tested in isolation.
vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ getEntityConfig: () => null }),
}));

const originalLocation = window.location;
const originalOpen = window.open;
const assignSpy = vi.fn();
const openSpy = vi.fn<(url?: string | URL, target?: string, features?: string) => Window | null>();

function setLocation(pathname: string, search = ""): void {
  const url = new URL(`http://localhost:3000${pathname}${search}`);
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...originalLocation,
      href: url.toString(),
      origin: url.origin,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      assign: assignSpy,
      replace: vi.fn(),
    },
  });
}

function mountBridge(): Root {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <VisualEditingBridgeProvider>
        <div />
      </VisualEditingBridgeProvider>
    );
  });
  currentRoot = root;
  return root;
}

function postMessageAct(data: VeOpenFieldMessage): void {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data, origin: window.location.origin }));
  });
}

let currentRoot: Root | null = null;

beforeEach(() => {
  assignSpy.mockReset();
  openSpy.mockReset();
  // Default: popup allowed — return a truthy Window stub so the bridge doesn't
  // fall back to `window.location.assign`.
  openSpy.mockReturnValue({} as Window);
  window.open = openSpy as unknown as typeof window.open;
  document.body.innerHTML = "";
});

afterEach(() => {
  if (currentRoot) {
    act(() => {
      currentRoot!.unmount();
    });
    currentRoot = null;
  }
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  window.open = originalOpen;
});

describe("VisualEditingBridgeProvider — collection routing", () => {
  it("opens a new tab when the message is for a different collection with the same docId", () => {
    // Admin is on pages/1. Message arrives for forms/1 (same id, different collection).
    setLocation("/admin/collections/pages/1");
    mountBridge();
    postMessageAct({
      type: VE_MESSAGE_TYPE,
      path: "content",
      docId: "1",
      collectionSlug: "forms",
      kind: "collection",
    });
    expect(openSpy).toHaveBeenCalledTimes(1);
    const [url, target] = openSpy.mock.calls[0]!;
    expect(url).toContain("/admin/collections/forms/1");
    expect(url).toContain("veFocus=content");
    expect(target).toBe("_blank");
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("does not navigate when collection and docId both match", () => {
    setLocation("/admin/collections/pages/1");
    document.body.innerHTML = '<div id="field-title"></div>';
    mountBridge();
    postMessageAct({
      type: VE_MESSAGE_TYPE,
      path: "title",
      docId: "1",
      collectionSlug: "pages",
      kind: "collection",
    });
    expect(openSpy).not.toHaveBeenCalled();
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("opens a new tab when admin is not on a collection page", () => {
    setLocation("/admin");
    mountBridge();
    postMessageAct({
      type: VE_MESSAGE_TYPE,
      path: "title",
      docId: "5",
      collectionSlug: "pages",
      kind: "collection",
    });
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0]![0]).toContain("/admin/collections/pages/5");
  });

  it("opens a new tab without veFocus when message.path is empty", () => {
    setLocation("/admin/collections/pages/1");
    mountBridge();
    postMessageAct({
      type: VE_MESSAGE_TYPE,
      path: "",
      docId: "m-9",
      collectionSlug: "media",
      kind: "collection",
    });
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0]![0]).toBe("/admin/collections/media/m-9");
  });

  it("falls back to same-tab navigation when window.open is blocked (returns null)", () => {
    setLocation("/admin/collections/pages/1");
    openSpy.mockReturnValueOnce(null);
    mountBridge();
    postMessageAct({
      type: VE_MESSAGE_TYPE,
      path: "title",
      docId: "2",
      collectionSlug: "pages",
      kind: "collection",
    });
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(assignSpy).toHaveBeenCalledTimes(1);
    expect(assignSpy.mock.calls[0]![0]).toContain("/admin/collections/pages/2");
  });
});
