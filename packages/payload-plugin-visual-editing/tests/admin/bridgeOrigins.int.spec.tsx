import { act, useContext, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PreviewPagesContext } from "../../src/admin/previewPages";
import type { PreviewPage } from "../../src/admin/previewPages";
import { VisualEditingBridgeProvider } from "../../src/admin/VisualEditingBridgeProvider";
import { VE_MESSAGE_TYPE } from "../../src/shared/protocol";
import type { VeOpenFieldMessage } from "../../src/shared/protocol";

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ getEntityConfig: () => null }),
}));

const SITE_ORIGIN = "https://site.example";
const OTHER_ORIGIN = "https://elsewhere.example";

const openFieldOfAnotherDocument: VeOpenFieldMessage = {
  type: VE_MESSAGE_TYPE,
  path: "title",
  docId: "7",
  collectionSlug: "pages",
  kind: "collection",
};

const originalOpen = window.open;
const openSpy = vi.fn<(url?: string | URL, target?: string) => Window | null>();
let root: Root | null = null;

function AnnouncedPreviewPage({ page }: { page: PreviewPage }) {
  const announce = useContext(PreviewPagesContext);
  useEffect(() => announce(page), [announce, page]);
  return null;
}

function mountBridgeWith(page: PreviewPage | null): void {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <VisualEditingBridgeProvider>
        {page ? <AnnouncedPreviewPage page={page} /> : null}
      </VisualEditingBridgeProvider>
    );
  });
}

function post(origin: string, source: Window | null): void {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", { data: openFieldOfAnotherDocument, origin, source })
    );
  });
}

const previewWindow = (): Window => ({ postMessage: vi.fn() }) as unknown as Window;

beforeEach(() => {
  openSpy.mockReset();
  openSpy.mockReturnValue({} as Window);
  window.open = openSpy as unknown as typeof window.open;
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  window.open = originalOpen;
  document.body.innerHTML = "";
});

describe("VisualEditingBridgeProvider — preview pages on another origin", () => {
  it("opens the field of a click from the live preview window on its own origin", () => {
    const frame = previewWindow();
    mountBridgeWith({ getWindow: () => frame, origin: SITE_ORIGIN });

    post(SITE_ORIGIN, frame);

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0]![0]).toContain("/admin/collections/pages/7");
  });

  it("ignores the live preview window once it shows a page of another origin", () => {
    const frame = previewWindow();
    mountBridgeWith({ getWindow: () => frame, origin: SITE_ORIGIN });

    post(OTHER_ORIGIN, frame);

    expect(openSpy).not.toHaveBeenCalled();
  });

  it("ignores a window of the preview origin that is not the live preview", () => {
    mountBridgeWith({ getWindow: previewWindow, origin: SITE_ORIGIN });

    post(SITE_ORIGIN, previewWindow());

    expect(openSpy).not.toHaveBeenCalled();
  });

  it("ignores another origin while no live preview is open", () => {
    mountBridgeWith(null);

    post(SITE_ORIGIN, previewWindow());

    expect(openSpy).not.toHaveBeenCalled();
  });

  it("stops accepting the preview origin after the live preview closes", () => {
    const frame = previewWindow();
    mountBridgeWith({ getWindow: () => frame, origin: SITE_ORIGIN });
    act(() => root!.render(<VisualEditingBridgeProvider>{null}</VisualEditingBridgeProvider>));

    post(SITE_ORIGIN, frame);

    expect(openSpy).not.toHaveBeenCalled();
  });
});
