import type { Root } from "react-dom/client";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaPickReceiver } from "../../src/admin/inlineEditing/MediaPickReceiver";
import {
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_MEDIA_PICKED_TYPE,
  VE_PICK_MEDIA_TYPE,
} from "../../src/shared/protocol";

import { flushMutations } from "../support/time";

const PREVIEW_ORIGIN = "http://localhost:3333";

type DrawerProps = {
  allowCreate?: boolean;
  onSelect: (selected: { collectionSlug: string; doc: Record<string, unknown> }) => void;
};

const admin = vi.hoisted(() => {
  const postMessage = vi.fn();
  const frame = { contentWindow: { postMessage } };
  return {
    closeDrawer: vi.fn(),
    dismissDrawer: (): void => undefined,
    dispatchFields: vi.fn(),
    drawer: null as DrawerProps | null,
    drawerOptions: vi.fn(),
    fields: { image: { value: 3 }, title: { value: "Title" } } as Record<
      string,
      { value: unknown }
    >,
    frame,
    iframeRef: { current: frame },
    openDrawer: vi.fn(),
    postToPreview: postMessage,
    setModified: vi.fn(),
  };
});

vi.mock("@payloadcms/ui", async () => {
  const { useState } = await import("react");
  return {
    useConfig: () => ({
      config: { blocksMap: {}, routes: { api: "/api" }, serverURL: "https://cms.example.com" },
      getEntityConfig: () => ({
        fields: [
          { name: "title", type: "text" },
          { name: "image", relationTo: "media", type: "upload" },
        ],
      }),
    }),
    useDocumentInfo: () => ({ collectionSlug: "page", id: 7 }),
    useForm: () => ({
      dispatchFields: admin.dispatchFields,
      getFields: () => admin.fields,
      setModified: admin.setModified,
    }),
    useListDrawer: (options: unknown) => {
      const [isDrawerOpen, setOpen] = useState(false);
      admin.drawerOptions(options);
      const ListDrawer = (props: DrawerProps) => {
        admin.drawer = isDrawerOpen ? props : null;
        return null;
      };
      const closeDrawer = () => {
        admin.closeDrawer();
        setOpen(false);
      };
      const openDrawer = () => {
        admin.openDrawer();
        setOpen(true);
      };
      admin.dismissDrawer = closeDrawer;
      return [ListDrawer, () => null, { closeDrawer, isDrawerOpen, openDrawer }];
    },
    useLivePreviewContext: () => ({
      iframeRef: admin.iframeRef,
      isLivePreviewing: true,
      popupRef: { current: null },
      previewWindowType: "iframe",
      url: `${PREVIEW_ORIGIN}/en/home`,
    }),
    useLocale: () => ({ code: "en" }),
  };
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const FIELD = {
  collectionSlug: "page",
  docId: "7",
  key: "image",
  kind: "collection",
  locale: "en",
};

const REQUEST = { ...FIELD, type: VE_PICK_MEDIA_TYPE };

const LIGHTHOUSE = { height: 600, id: 9, url: "/api/media/file/lighthouse.png", width: 800 };

const postRequest = ({
  data = REQUEST as object,
  origin = PREVIEW_ORIGIN,
  source = admin.frame.contentWindow as object,
} = {}) =>
  act(() => {
    const message = new MessageEvent("message", { data, origin });
    Object.defineProperty(message, "source", { value: source });
    window.dispatchEvent(message);
  });

const select = (doc: Record<string, unknown>) =>
  act(async () => {
    admin.drawer?.onSelect({ collectionSlug: "media", doc });
    await flushMutations();
  });

describe("MediaPickReceiver", () => {
  let root: Root;
  let container: HTMLElement;
  let fetchMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMedia = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(LIGHTHOUSE), ok: true } as Response)
    );
    vi.stubGlobal("fetch", fetchMedia);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<MediaPickReceiver />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    admin.drawer = null;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("opens no drawer until the preview page asks for one", () => {
    expect(admin.openDrawer).not.toHaveBeenCalled();
    expect(admin.drawer).toBeNull();
  });

  it("opens the list of the collection the upload field takes, where a file can be uploaded", () => {
    postRequest();

    expect(admin.drawerOptions).toHaveBeenLastCalledWith({
      collectionSlugs: ["media"],
      selectedCollection: "media",
    });
    expect(admin.openDrawer).toHaveBeenCalledTimes(1);
    expect(admin.drawer?.allowCreate).toBe(true);
  });

  it("writes the selected document into the form and marks the form as changed", async () => {
    postRequest();

    await select({ id: 9 });

    expect(admin.dispatchFields).toHaveBeenCalledWith({ path: "image", type: "UPDATE", value: 9 });
    expect(admin.setModified).toHaveBeenCalledWith(true);
    expect(admin.closeDrawer).toHaveBeenCalled();
  });

  it("tells the preview page what to show for the selected document", async () => {
    postRequest();

    await select({ id: 9 });

    expect(fetchMedia).toHaveBeenCalledWith("https://cms.example.com/api/media/9?depth=0", {
      credentials: "include",
    });
    expect(admin.postToPreview).toHaveBeenCalledWith(
      {
        ...FIELD,
        height: 600,
        type: VE_MEDIA_PICKED_TYPE,
        url: "/api/media/file/lighthouse.png",
        width: 800,
      },
      PREVIEW_ORIGIN
    );
  });

  it("tells the page what the list knew of the document when the API does not answer", async () => {
    fetchMedia.mockRejectedValue(new Error("offline"));
    postRequest();

    await select({ id: 9, url: "/from-the-list.png" });

    expect(admin.postToPreview).toHaveBeenCalledWith(
      { ...FIELD, type: VE_MEDIA_PICKED_TYPE, url: "/from-the-list.png" },
      PREVIEW_ORIGIN
    );
  });

  it("writes nothing when the drawer is closed without a selection, and opens it when asked again", async () => {
    postRequest();

    await act(async () => {
      admin.dismissDrawer();
      await flushMutations();
    });
    postRequest();

    expect(admin.dispatchFields).not.toHaveBeenCalled();
    expect(admin.postToPreview).not.toHaveBeenCalled();
    expect(admin.openDrawer).toHaveBeenCalledTimes(2);
  });

  it("opens the drawer again for a second request", async () => {
    postRequest();
    await select({ id: 9 });

    postRequest();

    expect(admin.openDrawer).toHaveBeenCalledTimes(2);
    expect(admin.drawer).not.toBeNull();
  });

  it("ignores a request from another origin", () => {
    postRequest({ origin: "https://elsewhere.example" });

    expect(admin.openDrawer).not.toHaveBeenCalled();
  });

  it("ignores a request from a window that is not the preview", () => {
    postRequest({ source: {} });

    expect(admin.openDrawer).not.toHaveBeenCalled();
  });

  it("tells the preview page when the field of its document takes no media", () => {
    postRequest({ data: { ...REQUEST, key: "title" } });

    expect(admin.openDrawer).not.toHaveBeenCalled();
    expect(admin.postToPreview).toHaveBeenCalledWith(
      { ...FIELD, key: "title", type: VE_FIELD_EDIT_REFUSED_TYPE },
      PREVIEW_ORIGIN
    );
  });

  it("says nothing about a request of another document, which another form may take", () => {
    postRequest({ data: { ...REQUEST, docId: "8" } });

    expect(admin.openDrawer).not.toHaveBeenCalled();
    expect(admin.postToPreview).not.toHaveBeenCalled();
  });

  it("stops listening when it unmounts", () => {
    act(() => root.render(null));

    postRequest();

    expect(admin.openDrawer).not.toHaveBeenCalled();
  });
});
