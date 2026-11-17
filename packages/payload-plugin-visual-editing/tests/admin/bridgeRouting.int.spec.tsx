import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VisualEditingBridgeProvider } from "../../src/admin/VisualEditingBridgeProvider";
import { OPEN_FIELD_EVENT } from "../../src/shared/openFieldEvent";
import type { OpenFieldEventDetail } from "../../src/shared/openFieldEvent";
import { VE_MESSAGE_TYPE } from "../../src/shared/protocol";
import type { VeOpenFieldMessage } from "../../src/shared/protocol";

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

function mountBridge(adminBasePath?: string): Root {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <VisualEditingBridgeProvider adminBasePath={adminBasePath}>
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

  it("finds the open document of an admin that is served from the root", () => {
    setLocation("/collections/pages/1");
    document.body.innerHTML = '<div id="field-title"></div>';
    mountBridge("/");
    postMessageAct({
      type: VE_MESSAGE_TYPE,
      path: "title",
      docId: "1",
      collectionSlug: "pages",
      kind: "collection",
    });
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("finds the open document under an id the address encodes", () => {
    setLocation("/admin/collections/pages/a%20b");
    document.body.innerHTML = '<div id="field-title"></div>';
    mountBridge();
    postMessageAct({
      type: VE_MESSAGE_TYPE,
      path: "title",
      docId: "a b",
      collectionSlug: "pages",
      kind: "collection",
    });
    expect(openSpy).not.toHaveBeenCalled();
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

describe("VisualEditingBridgeProvider — payload:open-field", () => {
  const listen = (cancel: boolean) => {
    const seen: OpenFieldEventDetail[] = [];
    const listener = (event: Event) => {
      seen.push((event as CustomEvent<OpenFieldEventDetail>).detail);
      if (cancel) event.preventDefault();
    };
    window.addEventListener(OPEN_FIELD_EVENT, listener);
    return { seen, stop: () => window.removeEventListener(OPEN_FIELD_EVENT, listener) };
  };

  it("announces the field of the open document before focusing it", async () => {
    setLocation("/admin/collections/pages/1");
    const { seen, stop } = listen(false);
    mountBridge();
    postMessageAct({
      type: VE_MESSAGE_TYPE,
      path: "layout.0.items.1.title",
      docId: "1",
      collectionSlug: "pages",
      kind: "collection",
      locale: "en",
    });
    await act(async () => {});
    stop();
    expect(seen).toEqual([
      { path: "layout.0.items.1.title", collectionSlug: "pages", docId: "1", locale: "en" },
    ]);
  });

  it("leaves the field to the listener that cancels the event", async () => {
    setLocation("/admin/collections/pages/1");
    document.body.innerHTML =
      '<div id="layout-row-0"><button class="collapsible__toggle collapsible__toggle--collapsed"></button></div>';
    const toggle = document.querySelector("button")!;
    const clicks = vi.fn();
    toggle.addEventListener("click", clicks);
    const { seen, stop } = listen(true);
    mountBridge();
    postMessageAct({
      type: VE_MESSAGE_TYPE,
      path: "layout.0.title",
      docId: "1",
      collectionSlug: "pages",
      kind: "collection",
    });
    await act(async () => {});
    stop();
    expect(seen).toHaveLength(1);
    expect(clicks).not.toHaveBeenCalled();
  });

  it("does not announce fields of another document (that one opens in a new tab)", () => {
    setLocation("/admin/collections/pages/1");
    const { seen, stop } = listen(true);
    mountBridge();
    postMessageAct({
      type: VE_MESSAGE_TYPE,
      path: "title",
      docId: "2",
      collectionSlug: "pages",
      kind: "collection",
    });
    stop();
    expect(seen).toEqual([]);
    expect(openSpy).toHaveBeenCalledTimes(1);
  });
});
