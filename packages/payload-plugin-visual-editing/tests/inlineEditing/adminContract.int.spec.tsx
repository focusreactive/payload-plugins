import type { Root } from "react-dom/client";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminEditChannel } from "../../src/client/inlineEditing/adminEditChannel";
import type { EditTransport, ShownImage } from "../../src/client/inlineEditing/editTransport";
import type { VeRichTextStateRequestMessage } from "../../src/shared/protocol";
import type { WindowPair } from "../support/windowPair";

import { InlineEditReceiver } from "../../src/admin/inlineEditing/InlineEditReceiver";
import { MediaPickReceiver } from "../../src/admin/inlineEditing/MediaPickReceiver";
import { RichTextEditReceiver } from "../../src/admin/inlineEditing/RichTextEditReceiver";
import { createAdminEditChannel } from "../../src/client/inlineEditing/adminEditChannel";
import { createEditRoutes } from "../../src/client/inlineEditing/editRoutes";
import { createEditTransport } from "../../src/client/inlineEditing/editTransport";
import {
  VE_RICH_TEXT_STATE_REQUEST_TYPE,
  VE_RICH_TEXT_VALUE_PATH,
} from "../../src/shared/protocol";

import { createWindowPair } from "../support/windowPair";

const ADMIN_ORIGIN = "https://cms.example.com";
const PAGE_ORIGIN = "http://localhost:3333";
const API = `${ADMIN_ORIGIN}/api`;

const BOLD = 1;

const text = (value: string, format = 0) => ({
  detail: 0,
  format,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
});

const paragraphOf = (...children: object[]) => ({
  children,
  direction: null,
  format: "",
  indent: 0,
  type: "paragraph",
  version: 1,
});

const stateOf = (...children: object[]) => ({
  root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
});

const BODY_STATE = stateOf(paragraphOf(text("Body", BOLD)));

const EDITED_BODY_STATE = stateOf(paragraphOf(text("Body, edited", BOLD)));

const EVERY_FIELD = vi.hoisted(() => ({ fields: true, read: true, update: true }));

type DrawerProps = { onSelect: (selected: { doc: Record<string, unknown> }) => void };

const admin = vi.hoisted(() => ({
  closeDrawer: (): void => undefined,
  dispatchFields: vi.fn(),
  drawer: null as DrawerProps | null,
  fields: {} as Record<string, { value: unknown }>,
  isFormDisabled: false,
  permissions: EVERY_FIELD as object,
  previewWindow: null as unknown,
  previewWindowType: "iframe",
  setModified: vi.fn(),
}));

vi.mock("@payloadcms/ui", async () => {
  const { useState } = await import("react");
  return {
    useConfig: () => ({
      config: { blocksMap: {}, routes: { api: "/api" }, serverURL: "https://cms.example.com" },
      getEntityConfig: () => ({
        fields: [
          { name: "title", type: "text" },
          { name: "body", type: "richText" },
          { name: "image", relationTo: "media", type: "upload" },
        ],
      }),
    }),
    useDocumentInfo: () => ({ collectionSlug: "page", docPermissions: admin.permissions, id: 7 }),
    useForm: () => ({
      disabled: admin.isFormDisabled,
      dispatchFields: admin.dispatchFields,
      getFields: () => admin.fields,
      setModified: admin.setModified,
    }),
    useListDrawer: () => {
      const [isDrawerOpen, setOpen] = useState(false);
      const ListDrawer = (props: DrawerProps) => {
        admin.drawer = isDrawerOpen ? props : null;
        return null;
      };
      const closeDrawer = () => setOpen(false);
      admin.closeDrawer = closeDrawer;
      return [
        ListDrawer,
        () => null,
        { closeDrawer, isDrawerOpen, openDrawer: () => setOpen(true) },
      ];
    },
    useLivePreviewContext: () => ({
      iframeRef: { current: { contentWindow: admin.previewWindow } },
      isLivePreviewing: true,
      popupRef: { current: admin.previewWindow },
      previewWindowType: admin.previewWindowType,
      url: `${PAGE_ORIGIN}/en/home`,
    }),
    useLocale: () => ({ code: "en" }),
  };
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const DOCUMENT = { collectionSlug: "page", docId: "7", kind: "collection", locale: "en" } as const;

const TITLE = { ...DOCUMENT, key: "title" };

const BODY = { ...DOCUMENT, key: "body" };

const IMAGE = { ...DOCUMENT, key: "image" };

const LIGHTHOUSE = { height: 600, id: 9, url: "/api/media/file/lighthouse.png", width: 800 };

const FORMATS = { hasLinks: false, hasQuotes: false, headings: [], lists: [], textFormats: BOLD };

const answerOf = (body: unknown) =>
  Promise.resolve({ json: () => Promise.resolve(body), ok: true } as Response);

const answersOfTheAdmin = (url: string) => {
  if (url === `${API}${VE_RICH_TEXT_VALUE_PATH}`)
    return answerOf({ formats: FORMATS, value: null });
  if (url.startsWith(`${API}/media/9`)) return answerOf(LIGHTHOUSE);
  return answerOf({});
};

type PageImage = ShownImage & {
  show: ReturnType<typeof vi.fn>;
  openField: ReturnType<typeof vi.fn>;
};

const pageImage = (): PageImage => ({
  openField: vi.fn(),
  show: vi.fn(() => null),
  shownMediaId: "3",
});

const MESSAGE_DELIVERY_MS = 1;

const delivered = () => act(() => vi.advanceTimersByTimeAsync(MESSAGE_DELIVERY_MS));

describe("the page and the admin, wired through their windows", () => {
  let root: Root;
  let container: HTMLElement;
  let pair: WindowPair;
  let channel: AdminEditChannel;
  let transport: EditTransport;
  let statuses: [string, string | undefined][];
  let fetchOfTheAdmin: ReturnType<typeof vi.fn>;
  let fetchOfThePage: ReturnType<typeof vi.fn>;

  const open = ({ isPopup = false } = {}) => {
    pair = createWindowPair({ adminOrigin: ADMIN_ORIGIN, isPopup, pageOrigin: PAGE_ORIGIN });
    Object.assign(pair.page, { fetch: fetchOfThePage });
    admin.previewWindow = pair.page;
    admin.previewWindowType = isPopup ? "popup" : "iframe";
    channel = createAdminEditChannel(pair.page, () => ADMIN_ORIGIN);
    transport = createEditTransport(
      () => ({ payloadApi: API }),
      (status, refusal) => statuses.push([status, refusal]),
      pair.page,
      createEditRoutes({ holdsAnyForm: () => true, win: pair.page }),
      channel
    );
    act(() =>
      root.render(
        <>
          <InlineEditReceiver />
          <RichTextEditReceiver />
          <MediaPickReceiver />
        </>
      )
    );
  };

  beforeEach(() => {
    vi.useFakeTimers();
    statuses = [];
    admin.fields = {
      body: { value: BODY_STATE },
      image: { value: 3 },
      title: { value: "Title" },
    };
    fetchOfTheAdmin = vi.fn(answersOfTheAdmin);
    fetchOfThePage = vi.fn(() => answerOf({ saved: true }));
    vi.stubGlobal("fetch", fetchOfTheAdmin);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    transport.dispose();
    channel.dispose();
    act(() => root.unmount());
    container.remove();
    admin.drawer = null;
    admin.isFormDisabled = false;
    admin.permissions = EVERY_FIELD;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("writes a text typed on the page into the form", async () => {
    open();
    const edit = transport.beginEdit(TITLE, "Title");
    edit.change("New title");
    edit.end();
    await delivered();

    expect(admin.dispatchFields).toHaveBeenCalledWith({
      path: "title",
      type: "UPDATE",
      value: "New title",
    });
    expect(admin.setModified).toHaveBeenCalledWith(true);
    expect(statuses).toEqual([
      ["unsaved", undefined],
      ["in-form", undefined],
    ]);
  });

  it("shows the reason the form refused a text edit", async () => {
    admin.permissions = { fields: { title: { read: true } }, read: true, update: true };
    open();
    const edit = transport.beginEdit(TITLE, "Title");
    edit.change("New title");
    edit.end();
    await delivered();

    expect(admin.dispatchFields).not.toHaveBeenCalled();
    expect(statuses.at(-1)).toEqual(["failed", "not-editable"]);
  });

  it("answers a state of rich text the page asks for, which an edit then writes back", async () => {
    open();
    const answered = vi.fn();
    const request: VeRichTextStateRequestMessage = {
      ...BODY,
      type: VE_RICH_TEXT_STATE_REQUEST_TYPE,
    };
    channel.richTextStates.ask(pair.admin, request, { answered, refused: vi.fn() });
    await delivered();

    expect(answered).toHaveBeenCalledWith({ formats: FORMATS, state: BODY_STATE });

    const edit = transport.beginEdit(BODY, BODY_STATE);
    edit.change(EDITED_BODY_STATE);
    edit.end();
    await delivered();

    expect(admin.dispatchFields).toHaveBeenCalledWith({
      initialValue: EDITED_BODY_STATE,
      path: "body",
      type: "UPDATE",
      value: EDITED_BODY_STATE,
    });
  });

  it("refuses a state of rich text the form does not hold, with its reason", async () => {
    admin.isFormDisabled = true;
    open();
    const refused = vi.fn();
    const request: VeRichTextStateRequestMessage = {
      ...BODY,
      type: VE_RICH_TEXT_STATE_REQUEST_TYPE,
    };
    channel.richTextStates.ask(pair.admin, request, { answered: vi.fn(), refused });
    await delivered();

    expect(refused).toHaveBeenCalledWith("not-editable");
  });

  it("shows an image picked in the drawer of the admin", async () => {
    open();
    const image = pageImage();

    expect(transport.beginImageEdit(IMAGE, image).pickInTheDrawer()).toBe(true);

    await delivered();
    await act(async () => {
      admin.drawer?.onSelect({ doc: { id: 9 } });
      await vi.advanceTimersByTimeAsync(0);
    });
    await delivered();

    expect(admin.dispatchFields).toHaveBeenCalledWith({ path: "image", type: "UPDATE", value: 9 });
    expect(image.show).toHaveBeenCalledWith({
      height: 600,
      id: 9,
      url: LIGHTHOUSE.url,
      width: 800,
    });
    expect(statuses).toEqual([["in-form", undefined]]);
  });

  it("opens the field of an image the form refuses to pick for", async () => {
    admin.permissions = { fields: { image: { read: true } }, read: true, update: true };
    open();
    const image = pageImage();
    transport.beginImageEdit(IMAGE, image).pickInTheDrawer();
    await delivered();

    expect(admin.drawer).toBeNull();
    expect(image.openField).toHaveBeenCalledTimes(1);
    expect(channel.mediaPicks.isAsked(IMAGE)).toBe(false);
  });

  it("frees the image of a drawer closed without a pick", async () => {
    open();
    const image = pageImage();
    transport.beginImageEdit(IMAGE, image).pickInTheDrawer();
    await delivered();

    expect(channel.mediaPicks.isAsked(IMAGE)).toBe(true);

    act(() => admin.closeDrawer());
    await delivered();

    expect(channel.mediaPicks.isAsked(IMAGE)).toBe(false);
    expect(image.show).not.toHaveBeenCalled();
    expect(image.openField).not.toHaveBeenCalled();
  });

  it("asks nothing more of an admin closed while it was asked, and saves the next pick itself", async () => {
    open({ isPopup: true });
    const image = pageImage();
    transport.beginImageEdit(IMAGE, image).use({ ...LIGHTHOUSE, filename: "", thumbnailUrl: "" });
    pair.closeAdmin();
    await delivered();

    expect(admin.dispatchFields).not.toHaveBeenCalled();
    expect(channel.mediaPicks.isAsked(IMAGE)).toBe(false);

    const request: VeRichTextStateRequestMessage = {
      ...BODY,
      type: VE_RICH_TEXT_STATE_REQUEST_TYPE,
    };
    channel.richTextStates.ask(pair.admin, request, { answered: vi.fn(), refused: vi.fn() });

    expect(channel.richTextStates.isAsked(BODY)).toBe(false);

    transport.beginImageEdit(IMAGE, image).use({ ...LIGHTHOUSE, filename: "", thumbnailUrl: "" });
    await delivered();

    expect(fetchOfThePage).toHaveBeenCalledWith(
      `${API}/visual-editing/field-edit`,
      expect.anything()
    );
  });
});
