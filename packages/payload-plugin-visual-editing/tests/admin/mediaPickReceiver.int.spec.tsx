import type { Root } from "react-dom/client";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaPickReceiver } from "../../src/admin/inlineEditing/MediaPickReceiver";
import {
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_MEDIA_OPTIONS_ANSWER_TYPE,
  VE_MEDIA_OPTIONS_REQUEST_TYPE,
  VE_MEDIA_PICK_CANCELLED_TYPE,
  VE_MEDIA_PICKED_TYPE,
  VE_MEDIA_UPLOAD_ANSWER_TYPE,
  VE_MEDIA_UPLOAD_TYPE,
  VE_PICK_MEDIA_TYPE,
} from "../../src/shared/protocol";

import { flushMutations } from "../support/time";

const PREVIEW_ORIGIN = "http://localhost:3333";

type DrawerProps = {
  allowCreate?: boolean;
  onSelect: (selected: { collectionSlug: string; doc: Record<string, unknown> }) => void;
};

const EVERY_FIELD = vi.hoisted(() => ({ fields: true, read: true, update: true }));

const IMAGE_READ_ONLY = { fields: { image: { read: true } }, read: true, update: true };

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
    permissions: EVERY_FIELD as object,
    postToPreview: postMessage,
    setModified: vi.fn(),
  };
});

vi.mock("@payloadcms/ui", async () => {
  const { useState } = await import("react");
  return {
    useConfig: () => ({
      config: { blocksMap: {}, routes: { api: "/api" }, serverURL: "https://cms.example.com" },
      getEntityConfig: ({ collectionSlug }: { collectionSlug: string }) => ({
        fields:
          collectionSlug === "media"
            ? [
                { name: "alt", type: "text" },
                { fields: [{ name: "caption", type: "textarea" }], type: "row" },
                { name: "credit", options: ["Staff"], type: "select" },
              ]
            : [
                { name: "title", type: "text" },
                { name: "image", relationTo: "media", type: "upload" },
              ],
      }),
    }),
    useDocumentInfo: () => ({ collectionSlug: "page", docPermissions: admin.permissions, id: 7 }),
    useFormModified: () => false,
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

const LIGHTHOUSE = {
  alt: "A lighthouse",
  filename: "lighthouse.png",
  height: 600,
  id: 9,
  url: "/api/media/file/lighthouse.png",
  width: 800,
};

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
    admin.permissions = EVERY_FIELD;
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

  it("tells the preview page what to show for the selected document, and what it is", async () => {
    postRequest();

    await select({ id: 9 });

    expect(fetchMedia).toHaveBeenCalledWith("https://cms.example.com/api/media/9?depth=0", {
      credentials: "include",
    });
    expect(admin.postToPreview).toHaveBeenCalledWith(
      {
        ...FIELD,
        alt: "A lighthouse",
        filename: "lighthouse.png",
        height: 600,
        id: 9,
        type: VE_MEDIA_PICKED_TYPE,
        url: "/api/media/file/lighthouse.png",
        width: 800,
      },
      PREVIEW_ORIGIN
    );
  });

  it("tells the preview page the description from the field that describes the media", async () => {
    const { alt, ...undescribed } = LIGHTHOUSE;
    fetchMedia.mockResolvedValue({
      json: () => Promise.resolve({ ...undescribed, caption: alt }),
      ok: true,
    } as Response);
    act(() => root.render(<MediaPickReceiver imageDescriptionField="caption" />));
    postRequest();

    await select({ id: 9 });

    expect(admin.postToPreview).toHaveBeenCalledWith(
      expect.objectContaining({ alt: "A lighthouse", type: VE_MEDIA_PICKED_TYPE }),
      PREVIEW_ORIGIN
    );
  });

  it("tells the preview page no description from a field of the media that holds no text", async () => {
    fetchMedia.mockResolvedValue({
      json: () => Promise.resolve({ ...LIGHTHOUSE, credit: "Staff" }),
      ok: true,
    } as Response);
    act(() => root.render(<MediaPickReceiver imageDescriptionField="credit" />));
    postRequest();

    await select({ id: 9 });

    expect(admin.postToPreview).toHaveBeenCalledWith(
      expect.not.objectContaining({ alt: expect.anything() }),
      PREVIEW_ORIGIN
    );
    expect(admin.postToPreview).toHaveBeenCalledWith(
      expect.objectContaining({ type: VE_MEDIA_PICKED_TYPE }),
      PREVIEW_ORIGIN
    );
  });

  it("writes media chosen on the page into the form without a drawer", async () => {
    postRequest({ data: { ...REQUEST, mediaId: 9 } });
    await act(() => flushMutations());

    expect(admin.openDrawer).not.toHaveBeenCalled();
    expect(admin.dispatchFields).toHaveBeenCalledWith({ path: "image", type: "UPDATE", value: 9 });
  });

  it("refuses media chosen on the page that it cannot read, as a save that failed", async () => {
    fetchMedia.mockRejectedValue(new Error("offline"));

    postRequest({ data: { ...REQUEST, mediaId: 9 } });
    await act(() => flushMutations());

    expect(admin.dispatchFields).not.toHaveBeenCalled();
    expect(admin.postToPreview).toHaveBeenCalledWith(
      { ...FIELD, reason: "failed", type: VE_FIELD_EDIT_REFUSED_TYPE },
      PREVIEW_ORIGIN
    );
  });

  it("tells the page what the list knew of the document when the API does not answer", async () => {
    fetchMedia.mockRejectedValue(new Error("offline"));
    postRequest();

    await select({ id: 9, url: "/from-the-list.png" });

    expect(admin.postToPreview).toHaveBeenCalledWith(
      { ...FIELD, id: 9, type: VE_MEDIA_PICKED_TYPE, url: "/from-the-list.png" },
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
    expect(admin.openDrawer).toHaveBeenCalledTimes(2);
  });

  it("tells the preview page when the drawer is closed without a selection", async () => {
    postRequest();

    await act(async () => {
      admin.dismissDrawer();
      await flushMutations();
    });

    expect(admin.postToPreview).toHaveBeenCalledTimes(1);
    expect(admin.postToPreview).toHaveBeenCalledWith(
      { ...FIELD, type: VE_MEDIA_PICK_CANCELLED_TYPE },
      PREVIEW_ORIGIN
    );
  });

  it("tells the preview page the pick is cancelled when it unmounts while the drawer is open", () => {
    postRequest();

    act(() => root.render(null));

    expect(admin.postToPreview).toHaveBeenCalledWith(
      { ...FIELD, type: VE_MEDIA_PICK_CANCELLED_TYPE },
      PREVIEW_ORIGIN
    );
  });

  it("tells the preview page nothing when it unmounts without an open drawer", () => {
    act(() => root.render(null));

    expect(admin.postToPreview).not.toHaveBeenCalled();
  });

  it("calls a pick that was made no cancelled one", async () => {
    postRequest();

    await select({ id: 9 });

    const types = admin.postToPreview.mock.calls.map(
      ([message]) => (message as { type: string }).type
    );
    expect(types).toEqual([VE_MEDIA_PICKED_TYPE]);
  });

  it("calls the pick cancelled when it cannot tell the page what to show", async () => {
    fetchMedia.mockRejectedValue(new Error("offline"));
    postRequest();

    await select({ id: 9 });

    expect(admin.dispatchFields).toHaveBeenCalled();
    expect(admin.postToPreview).toHaveBeenCalledWith(
      { ...FIELD, type: VE_MEDIA_PICK_CANCELLED_TYPE },
      PREVIEW_ORIGIN
    );
  });

  it("refuses a second request while the drawer is open and keeps the drawer", () => {
    postRequest();
    const openDrawer = admin.drawer;

    postRequest({ data: { ...REQUEST, key: "image" } });

    expect(admin.openDrawer).toHaveBeenCalledTimes(1);
    expect(admin.drawer).toBe(openDrawer);
    expect(admin.postToPreview).toHaveBeenCalledWith(
      { ...FIELD, reason: "failed", type: VE_FIELD_EDIT_REFUSED_TYPE },
      PREVIEW_ORIGIN
    );
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
      { ...FIELD, key: "title", reason: "not-editable", type: VE_FIELD_EDIT_REFUSED_TYPE },
      PREVIEW_ORIGIN
    );
  });

  it("tells the preview page when the user may read the field and not update it", () => {
    admin.permissions = IMAGE_READ_ONLY;
    act(() => root.render(<MediaPickReceiver />));

    postRequest();

    expect(admin.openDrawer).not.toHaveBeenCalled();
    expect(admin.postToPreview).toHaveBeenCalledWith(
      { ...FIELD, reason: "not-editable", type: VE_FIELD_EDIT_REFUSED_TYPE },
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

describe("MediaPickReceiver, for the list of media of a page in a pop-up", () => {
  const API = "https://cms.example.com/api";
  const LISTED = { collection: "media", documents: [LIGHTHOUSE], hasNextPage: false };
  const LISTING = {
    ...FIELD,
    page: 1,
    requestId: "1",
    search: "light",
    type: VE_MEDIA_OPTIONS_REQUEST_TYPE,
  };
  const REFUSED = { answer: { reason: "not-editable" }, ok: false };
  const file = new File(["pixels"], "lighthouse.png", { type: "image/png" });
  const UPLOAD = {
    ...FIELD,
    collection: "media",
    file,
    requestId: "2",
    type: VE_MEDIA_UPLOAD_TYPE,
  };
  let root: Root;
  let container: HTMLElement;
  let fetchApi: ReturnType<typeof vi.fn>;

  const answered = (body: unknown, ok = true) =>
    fetchApi.mockResolvedValue({ json: () => Promise.resolve(body), ok } as Response);

  const ask = async (data: object) => {
    postRequest({ data });
    await act(() => flushMutations());
  };

  const toldThePage = () => admin.postToPreview.mock.calls;

  beforeEach(() => {
    fetchApi = vi.fn();
    vi.stubGlobal("fetch", fetchApi);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<MediaPickReceiver />));
  });

  afterEach(() => {
    act(() => root.unmount());
    admin.permissions = EVERY_FIELD;
    container.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("lists the media of the field through its endpoint, with the session of the editor", async () => {
    answered(LISTED);

    await ask(LISTING);

    const [url, init] = fetchApi.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API}/visual-editing/media-options`);
    expect(init).toMatchObject({ credentials: "include", method: "POST" });
    expect(JSON.parse(init.body as string)).toEqual({ ...FIELD, page: 1, search: "light" });
    expect(toldThePage()).toEqual([
      [
        { answer: LISTED, ok: true, requestId: "1", type: VE_MEDIA_OPTIONS_ANSWER_TYPE },
        PREVIEW_ORIGIN,
      ],
    ]);
  });

  it("uploads a file to the collection of the field and passes on what the server answers", async () => {
    const refused = { errors: [{ message: "The file is too large" }] };
    answered(refused, false);

    await ask(UPLOAD);

    const [url, init] = fetchApi.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API}/media?depth=0`);
    expect(init).toMatchObject({ credentials: "include", method: "POST" });
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
    expect(toldThePage()).toEqual([
      [
        { answer: refused, ok: false, requestId: "2", type: VE_MEDIA_UPLOAD_ANSWER_TYPE },
        PREVIEW_ORIGIN,
      ],
    ]);
  });

  it("refuses a field the user may read and not update, and asks the API nothing", async () => {
    admin.permissions = IMAGE_READ_ONLY;
    act(() => root.render(<MediaPickReceiver />));

    await ask(LISTING);
    await ask(UPLOAD);

    expect(fetchApi).not.toHaveBeenCalled();
    expect(toldThePage()).toEqual([
      [{ ...REFUSED, requestId: "1", type: VE_MEDIA_OPTIONS_ANSWER_TYPE }, PREVIEW_ORIGIN],
      [{ ...REFUSED, requestId: "2", type: VE_MEDIA_UPLOAD_ANSWER_TYPE }, PREVIEW_ORIGIN],
    ]);
  });

  it("refuses a field that takes no upload and an upload to another collection", async () => {
    await ask({ ...LISTING, key: "title" });
    await ask({ ...UPLOAD, collection: "users" });

    expect(fetchApi).not.toHaveBeenCalled();
    expect(toldThePage()).toEqual([
      [{ ...REFUSED, requestId: "1", type: VE_MEDIA_OPTIONS_ANSWER_TYPE }, PREVIEW_ORIGIN],
      [{ ...REFUSED, requestId: "2", type: VE_MEDIA_UPLOAD_ANSWER_TYPE }, PREVIEW_ORIGIN],
    ]);
  });

  it("answers no answer when the API cannot be reached", async () => {
    fetchApi.mockRejectedValue(new Error("offline"));

    await ask(LISTING);

    expect(toldThePage()).toEqual([
      [
        { answer: null, ok: false, requestId: "1", type: VE_MEDIA_OPTIONS_ANSWER_TYPE },
        PREVIEW_ORIGIN,
      ],
    ]);
  });

  it("says nothing to a request from another origin or window, or of another document", async () => {
    postRequest({ data: LISTING, origin: "https://evil.example.com" });
    postRequest({ data: LISTING, source: window });
    await ask({ ...LISTING, docId: "8" });

    expect(fetchApi).not.toHaveBeenCalled();
    expect(admin.postToPreview).not.toHaveBeenCalled();
  });
});
