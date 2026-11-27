import { act, useContext, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PreviewPagesContext } from "../../src/admin/previewPages";
import type { PreviewPage } from "../../src/admin/previewPages";
import { VisualEditingBridgeProvider } from "../../src/admin/VisualEditingBridgeProvider";
import {
  DATA_VISUAL_EDITING_ADMIN_ATTR,
  LIVE_PREVIEW_FRAME_ID,
  VE_FRAME_HELLO_TYPE,
  VE_FRAME_SETTINGS_TYPE,
  VE_MESSAGE_TYPE,
} from "../../src/shared/protocol";
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

describe("VisualEditingBridgeProvider — frames asking whether to edit visually", () => {
  const frameInTheAdmin = ({ id, visualEditing }: { id?: string; visualEditing?: string } = {}) => {
    const frame = document.createElement("iframe");
    if (id) frame.id = id;
    if (visualEditing) frame.setAttribute("data-visual-editing", visualEditing);
    document.body.append(frame);
    const postToFrame = vi.spyOn(frame.contentWindow!, "postMessage");
    return { frame, postToFrame };
  };

  const helloFrom = (frame: HTMLIFrameElement, origin: string) =>
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: VE_FRAME_HELLO_TYPE },
          origin,
          source: frame.contentWindow,
        })
      );
    });

  const settings = (visualEditing: string) => ({ type: VE_FRAME_SETTINGS_TYPE, visualEditing });

  it("keeps visual editing on in the Live Preview frame", () => {
    mountBridgeWith({ getWindow: previewWindow, origin: SITE_ORIGIN });
    const { frame, postToFrame } = frameInTheAdmin({ id: LIVE_PREVIEW_FRAME_ID });

    helloFrom(frame, SITE_ORIGIN);

    expect(postToFrame).toHaveBeenCalledWith(settings("on"), SITE_ORIGIN);
  });

  it("turns visual editing off in any other frame of the admin, such as a card in a field", () => {
    mountBridgeWith({ getWindow: previewWindow, origin: SITE_ORIGIN });
    const { frame, postToFrame } = frameInTheAdmin();

    helloFrom(frame, SITE_ORIGIN);

    expect(postToFrame).toHaveBeenCalledWith(settings("off"), SITE_ORIGIN);
  });

  it("answers a frame of an origin it has no Live Preview for", () => {
    mountBridgeWith(null);
    const { frame, postToFrame } = frameInTheAdmin();

    helloFrom(frame, OTHER_ORIGIN);

    expect(postToFrame).toHaveBeenCalledWith(settings("off"), OTHER_ORIGIN);
  });

  it("follows the attribute of the frame over its place", () => {
    mountBridgeWith({ getWindow: previewWindow, origin: SITE_ORIGIN });
    const card = frameInTheAdmin({ visualEditing: "on" });
    const preview = frameInTheAdmin({ id: LIVE_PREVIEW_FRAME_ID, visualEditing: "off" });

    helloFrom(card.frame, SITE_ORIGIN);
    helloFrom(preview.frame, SITE_ORIGIN);

    expect(card.postToFrame).toHaveBeenCalledWith(settings("on"), SITE_ORIGIN);
    expect(preview.postToFrame).toHaveBeenCalledWith(settings("off"), SITE_ORIGIN);
  });

  it("answers no frame of an opaque origin, such as a sandboxed iframe", () => {
    mountBridgeWith({ getWindow: previewWindow, origin: SITE_ORIGIN });
    const { frame, postToFrame } = frameInTheAdmin();

    helloFrom(frame, "null");

    expect(postToFrame).not.toHaveBeenCalled();
  });

  it("tells the frames already in the admin when it mounts, whatever their origin", () => {
    const card = frameInTheAdmin();
    const preview = frameInTheAdmin({ id: LIVE_PREVIEW_FRAME_ID });

    mountBridgeWith(null);

    expect(card.postToFrame).toHaveBeenCalledWith(settings("off"), "*");
    expect(preview.postToFrame).toHaveBeenCalledWith(settings("on"), "*");
  });

  it("marks its document as the admin while it is mounted", () => {
    mountBridgeWith(null);
    expect(document.documentElement.hasAttribute(DATA_VISUAL_EDITING_ADMIN_ATTR)).toBe(true);

    act(() => root?.unmount());
    expect(document.documentElement.hasAttribute(DATA_VISUAL_EDITING_ADMIN_ATTR)).toBe(false);
  });

  it("answers only the frame that asked", () => {
    mountBridgeWith({ getWindow: previewWindow, origin: SITE_ORIGIN });
    const asking = frameInTheAdmin();
    const other = frameInTheAdmin();

    helloFrom(asking.frame, SITE_ORIGIN);

    expect(asking.postToFrame).toHaveBeenCalledOnce();
    expect(other.postToFrame).not.toHaveBeenCalled();
  });

  it("answers no window that is not a frame of the admin", () => {
    mountBridgeWith({ getWindow: previewWindow, origin: SITE_ORIGIN });
    const { postToFrame } = frameInTheAdmin();

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: VE_FRAME_HELLO_TYPE },
          origin: SITE_ORIGIN,
          source: previewWindow(),
        })
      );
    });

    expect(postToFrame).not.toHaveBeenCalled();
  });
});
