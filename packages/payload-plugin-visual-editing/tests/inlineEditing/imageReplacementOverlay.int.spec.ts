import type { MockInstance } from "vitest";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Overlay, OverlayCtx } from "../../src/client/createOverlay";

import { createOverlay } from "../../src/client/createOverlay";
import { DATA_VE_MEDIA_PICKER_ATTR } from "../../src/client/inlineEditing/mediaPicker";
import { DATA_VE_SAVE_STATUS_ATTR } from "../../src/client/inlineEditing/saveStatus";
import { DATA_VE_ACTION_ATTR } from "../../src/client/overlay/constants";
import {
  DATA_VE_COLLECTION_ATTR,
  DATA_VE_DOC_ID_ATTR,
  DATA_VE_KEY_ATTR,
  DATA_VE_KIND_ATTR,
  DATA_VE_LIVE_RICH_TEXT_ATTR,
  DATA_VE_LOCALE_ATTR,
  DATA_VE_PATH_ATTR,
  VE_DOCUMENT_SAVED_TYPE,
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_MEDIA_PICK_CANCELLED_TYPE,
  VE_MEDIA_PICKED_TYPE,
  VE_MESSAGE_TYPE,
  VE_PICK_MEDIA_TYPE,
} from "../../src/shared/protocol";

import { markedText } from "../support/markedData";
import { click, overlayCtx } from "../support/overlay";
import {
  ADMIN_ORIGIN,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
} from "../support/previewWindow";
import { flushMutations } from "../support/time";

const CMS = "https://cms.example.com";
const PAYLOAD_API = `${CMS}/api`;

const PAGE = { collectionSlug: "page", docId: "1", kind: "collection" } as const;

const IMAGE_FIELD = { ...PAGE, key: "image", locale: "en" };

const LIGHTHOUSE = {
  filename: "lighthouse.jpg",
  id: 9,
  thumbnailUrl: "/api/media/file/lighthouse-small.jpg",
  url: "/api/media/file/lighthouse.jpg",
};

const stega = (visible: string, path = "title", document: object = PAGE) =>
  markedText(visible, { ...PAGE, ...document, path });

const actionButton = () =>
  document.querySelector<HTMLButtonElement>(`[${DATA_VE_ACTION_ATTR}]`) as HTMLButtonElement;

const offersReplacement = (target: Element) => {
  target.dispatchEvent(new MouseEvent("mouseenter"));
  const button = actionButton();
  return button.style.display !== "none" && button.textContent === "Replace image";
};

const picker = () =>
  document.querySelector<HTMLElement>(`[${DATA_VE_MEDIA_PICKER_ATTR}]`)?.shadowRoot ?? null;

const statusLabel = () =>
  document.querySelector(`[${DATA_VE_SAVE_STATUS_ATTR}]`)?.shadowRoot?.querySelector("span")
    ?.textContent;

const retry = () =>
  document
    .querySelector(`[${DATA_VE_SAVE_STATUS_ATTR}]`)
    ?.shadowRoot?.querySelector("button")
    ?.click();

const messagesOfType = (post: ReturnType<typeof vi.fn>, type: string) =>
  post.mock.calls.map(([message]) => message as { type: string }).filter((m) => m.type === type);

const renderImage = (src = "/old.jpg") => {
  const rendered = document.createElement("img");
  rendered.setAttribute("src", src);
  rendered.setAttribute("srcset", `${src} 1x, /old@2x.jpg 2x`);
  return rendered;
};

describe("replacing an image on the page", () => {
  let main: HTMLElement;
  let image: HTMLImageElement;
  let overlay: Overlay;
  let ctx: OverlayCtx;
  let fetchApi: ReturnType<typeof vi.fn>;
  let isSaved: boolean;
  let optionsStatus: number;
  let open: MockInstance<typeof window.open>;

  const mark = <Target extends HTMLElement>(target: Target, path = "image", key?: string) => {
    target.setAttribute(DATA_VE_PATH_ATTR, path);
    target.setAttribute(DATA_VE_COLLECTION_ATTR, "page");
    target.setAttribute(DATA_VE_KIND_ATTR, "collection");
    target.setAttribute(DATA_VE_DOC_ID_ATTR, "1");
    if (key) target.setAttribute(DATA_VE_KEY_ATTR, key);
    return target;
  };

  const render = async <Target extends HTMLElement>(target: Target) => {
    main.append(target);
    await flushMutations();
    return target;
  };

  const start = (overrides: Partial<OverlayCtx> = {}) => {
    ctx = overlayCtx({
      inlineEditing: true,
      instantPreview: true,
      locale: "en",
      mode: "hover",
      payloadApi: PAYLOAD_API,
      ...overrides,
    });
    overlay = createOverlay(main, () => ctx);
  };

  const requestsTo = (path: string) =>
    fetchApi.mock.calls
      .filter(([url]) => url === `${PAYLOAD_API}${path}`)
      .map(([, init]) => JSON.parse((init as RequestInit).body as string));

  const useLighthouse = async () => {
    offersReplacement(image);
    click(actionButton());
    await flushMutations();
    picker()?.querySelector<HTMLButtonElement>(".grid button")?.click();
    picker()?.querySelector<HTMLButtonElement>('[data-action="use"]')?.click();
    await flushMutations();
  };

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    document.body.append(main);
    const heading = document.createElement("h1");
    heading.textContent = stega("Hello");
    image = mark(renderImage());
    main.append(heading, image);
    isSaved = true;
    optionsStatus = 200;
    fetchApi = vi.fn((url: string) => {
      const isListing = url.endsWith("/media-options");
      const body = isListing
        ? { collection: "media", documents: [LIGHTHOUSE], hasNextPage: false }
        : { saved: isSaved };
      const status = isListing ? optionsStatus : 200;
      const response = { json: () => Promise.resolve(body), ok: status === 200, status };
      return Promise.resolve(response as Response);
    });
    vi.stubGlobal("fetch", fetchApi);
    open = vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    overlay.dispose();
    restorePreviewWindow();
    vi.unstubAllGlobals();
    open.mockRestore();
  });

  describe("on a page of its own", () => {
    beforeEach(() => start());

    it("offers to replace an image that names its upload field", () => {
      expect(offersReplacement(image)).toBe(true);
    });

    it("offers it for a picture and for an element around one image", async () => {
      const picture = mark(document.createElement("picture"), "cover");
      picture.append(document.createElement("source"), renderImage());
      const figure = mark(document.createElement("figure"), "portrait");
      figure.append(renderImage());
      await render(picture);
      await render(figure);

      expect(offersReplacement(picture)).toBe(true);
      expect(offersReplacement(figure)).toBe(true);
    });

    it("offers nothing for an element around several images or none", async () => {
      const gallery = mark(document.createElement("div"), "gallery");
      gallery.append(renderImage(), renderImage());
      const related = mark(document.createElement("div"), "related");
      await render(gallery);
      await render(related);

      expect(offersReplacement(gallery)).toBe(false);
      expect(offersReplacement(related)).toBe(false);
    });

    it("offers nothing for an element that shows a text field next to its image", async () => {
      const card = mark(document.createElement("div"), "card");
      const caption = document.createElement("p");
      caption.textContent = stega("A harbour", "caption");
      card.append(renderImage(), caption);
      await render(card);

      expect(offersReplacement(card)).toBe(false);
    });

    it("offers nothing for rich text, also when it holds one image and no text", async () => {
      const richText = mark(document.createElement("div"), "body");
      richText.setAttribute(DATA_VE_LIVE_RICH_TEXT_ATTR, "{}");
      richText.append(renderImage());
      await render(richText);

      expect(offersReplacement(richText)).toBe(false);
    });

    it("offers nothing for an image that is the target of its description", async () => {
      const described = renderImage();
      described.setAttribute("alt", stega("A harbour", "alt", { collectionSlug: "media" }));
      await render(described);

      expect(described.hasAttribute(DATA_VE_PATH_ATTR)).toBe(true);
      expect(offersReplacement(described)).toBe(false);
    });

    it("offers nothing for a value read in every locale", async () => {
      const localized = mark(renderImage(), "localizedImage");
      localized.setAttribute(DATA_VE_LOCALE_ATTR, "de");
      await render(localized);

      expect(offersReplacement(localized)).toBe(false);
    });

    it("offers nothing while editing on the page is off", () => {
      ctx = { ...ctx, inlineEditing: false };
      overlay.applyMode();

      expect(offersReplacement(image)).toBe(false);
    });

    it("lists the media of the field in a picker when the button is clicked", async () => {
      offersReplacement(image);

      click(actionButton());
      await flushMutations();

      expect(requestsTo("/visual-editing/media-options")).toEqual([
        { ...IMAGE_FIELD, page: 1, search: "" },
      ]);
      expect(picker()?.querySelector(".grid span")?.textContent).toBe("lighthouse.jpg");
    });

    it("names the row of a list by its id", async () => {
      const ofRow = await render(mark(renderImage(), "layout.0.image", "layout.row-a.image"));
      offersReplacement(ofRow);

      click(actionButton());
      await flushMutations();

      expect(requestsTo("/visual-editing/media-options")).toMatchObject([
        { key: "layout.row-a.image" },
      ]);
    });

    it("shows the picked media at once and saves it into the field", async () => {
      await useLighthouse();

      expect(image.getAttribute("src")).toBe(`${CMS}/api/media/file/lighthouse.jpg`);
      expect(image.hasAttribute("srcset")).toBe(false);
      expect(requestsTo("/visual-editing/field-edit")).toEqual([{ ...IMAGE_FIELD, value: "9" }]);
      expect(statusLabel()).toBe("Saved");
    });

    it("says so when the save is refused, and saves again on Retry", async () => {
      isSaved = false;
      await useLighthouse();
      expect(statusLabel()).toBe("Not saved");
      isSaved = true;

      retry();
      await flushMutations();

      expect(requestsTo("/visual-editing/field-edit")).toHaveLength(2);
      expect(statusLabel()).toBe("Saved");
    });

    it("puts the image of the page back when the save is refused", async () => {
      isSaved = false;

      await useLighthouse();

      expect(image.getAttribute("src")).toBe("/old.jpg");
      expect(image.getAttribute("srcset")).toBe("/old.jpg 1x, /old@2x.jpg 2x");
    });

    it("shows the picked image again once a Retry saved it", async () => {
      isSaved = false;
      await useLighthouse();
      isSaved = true;

      retry();
      await flushMutations();

      expect(image.getAttribute("src")).toBe(`${CMS}/api/media/file/lighthouse.jpg`);
      expect(image.hasAttribute("srcset")).toBe(false);
    });

    it("opens the field in the admin when the endpoint says the field takes no media from the page", async () => {
      optionsStatus = 422;
      offersReplacement(image);

      click(actionButton());
      await flushMutations();

      expect(picker()).toBeNull();
      expect(open).toHaveBeenCalledTimes(1);
      expect(statusLabel()).toBeUndefined();
    });

    it("saves nothing when the picker is dismissed", async () => {
      offersReplacement(image);
      click(actionButton());
      await flushMutations();

      picker()?.querySelector<HTMLButtonElement>('[data-action="cancel"]')?.click();

      expect(image.getAttribute("src")).toBe("/old.jpg");
      expect(requestsTo("/visual-editing/field-edit")).toEqual([]);
    });

    it("removes the picker with the overlay", async () => {
      offersReplacement(image);
      click(actionButton());
      await flushMutations();

      overlay.dispose();

      expect(picker()).toBeNull();
      start();
    });
  });

  describe("on a page next to the admin", () => {
    const postToAdmin = vi.fn();

    const formOfThePage = () =>
      postFromAdmin({
        ...PAGE,
        fields: [{ key: "title", saved: "Hello", value: "Hello" }],
        locale: "en",
        type: VE_FIELD_SNAPSHOT_TYPE,
      });

    const picked = (overrides: object = {}) => ({
      ...IMAGE_FIELD,
      height: 600,
      type: VE_MEDIA_PICKED_TYPE,
      url: "/api/media/file/lighthouse.jpg",
      width: 800,
      ...overrides,
    });

    const ask = () => {
      offersReplacement(image);
      click(actionButton());
    };

    beforeEach(() => {
      postToAdmin.mockClear();
      stubAdminWindow({ postMessage: postToAdmin });
      start();
    });

    it("offers nothing for a document the admin holds no form of", () => {
      expect(offersReplacement(image)).toBe(false);
    });

    it("offers to replace the image once the admin sent values of its document", () => {
      formOfThePage();

      expect(offersReplacement(image)).toBe(true);
    });

    it("offers nothing for an image of another document than the open form", async () => {
      formOfThePage();
      const ofHeader = mark(renderImage(), "logo");
      ofHeader.setAttribute(DATA_VE_COLLECTION_ATTR, "header");
      await render(ofHeader);

      expect(offersReplacement(ofHeader)).toBe(false);
    });

    it("asks the admin to pick media for the field and draws no picker of its own", async () => {
      formOfThePage();

      ask();
      await flushMutations();

      expect(messagesOfType(postToAdmin, VE_PICK_MEDIA_TYPE)).toEqual([
        { ...IMAGE_FIELD, type: VE_PICK_MEDIA_TYPE },
      ]);
      expect(postToAdmin.mock.calls.every(([, origin]) => origin === ADMIN_ORIGIN)).toBe(true);
      expect(messagesOfType(postToAdmin, VE_MESSAGE_TYPE)).toEqual([]);
      expect(picker()).toBeNull();
      expect(fetchApi).not.toHaveBeenCalled();
    });

    it("shows the media the admin picked and says the form holds unsaved changes", () => {
      formOfThePage();
      ask();

      postFromAdmin(picked());

      expect(image.getAttribute("src")).toBe(`${CMS}/api/media/file/lighthouse.jpg`);
      expect(image.hasAttribute("srcset")).toBe(false);
      expect(statusLabel()).toBe("Unsaved changes");
    });

    it("asks once for a field whose pick is still open in the admin", () => {
      formOfThePage();
      ask();

      ask();
      postFromAdmin(picked());

      expect(messagesOfType(postToAdmin, VE_PICK_MEDIA_TYPE)).toHaveLength(1);
      expect(image.getAttribute("src")).toBe(`${CMS}/api/media/file/lighthouse.jpg`);
    });

    it("keeps saying unsaved when the admin saved another document", () => {
      formOfThePage();
      ask();
      postFromAdmin(picked());

      postFromAdmin({ ...PAGE, docId: "2", locale: "en", type: VE_DOCUMENT_SAVED_TYPE });

      expect(statusLabel()).toBe("Unsaved changes");
    });

    it("forgets a pick the editor cancelled in the admin and says nothing about it", () => {
      formOfThePage();
      ask();

      postFromAdmin({ ...IMAGE_FIELD, type: VE_MEDIA_PICK_CANCELLED_TYPE });
      postFromAdmin(picked());

      expect(image.getAttribute("src")).toBe("/old.jpg");
      expect(statusLabel()).toBeUndefined();
    });

    it("says the image is saved once the admin saved the document", () => {
      formOfThePage();
      ask();
      postFromAdmin(picked());

      postFromAdmin({ ...PAGE, locale: "en", type: VE_DOCUMENT_SAVED_TYPE });

      expect(statusLabel()).toBe("Saved");
    });

    it("ignores picked media that is not from the admin", () => {
      formOfThePage();
      ask();

      postFromAdmin(picked(), { origin: "https://elsewhere.example" });
      postFromAdmin(picked(), { source: {} });

      expect(image.getAttribute("src")).toBe("/old.jpg");
    });

    it("ignores picked media of a field it did not ask for", () => {
      formOfThePage();
      ask();

      postFromAdmin(picked({ key: "cover" }));
      postFromAdmin(picked({ url: undefined }));

      expect(image.getAttribute("src")).toBe("/old.jpg");
    });

    it("shows picked media once, not again for a later message", () => {
      formOfThePage();
      ask();
      postFromAdmin(picked());

      postFromAdmin(picked({ url: "/api/media/file/other.jpg" }));

      expect(image.getAttribute("src")).toBe(`${CMS}/api/media/file/lighthouse.jpg`);
    });

    it("says so when the form cannot take the request, and opens the field instead", () => {
      formOfThePage();
      ask();

      postFromAdmin({ ...IMAGE_FIELD, type: VE_FIELD_EDIT_REFUSED_TYPE });

      expect(statusLabel()).toBe("Not saved");
      expect(image.getAttribute("src")).toBe("/old.jpg");
      expect(messagesOfType(postToAdmin, VE_MESSAGE_TYPE)).toMatchObject([{ path: "image" }]);
    });

    it("asks the admin for no drawer again on Retry after a refusal", () => {
      formOfThePage();
      ask();
      postFromAdmin({ ...IMAGE_FIELD, type: VE_FIELD_EDIT_REFUSED_TYPE });

      retry();
      postFromAdmin({ ...IMAGE_FIELD, type: VE_FIELD_EDIT_REFUSED_TYPE });

      expect(messagesOfType(postToAdmin, VE_PICK_MEDIA_TYPE)).toHaveLength(1);
      expect(messagesOfType(postToAdmin, VE_MESSAGE_TYPE)).toHaveLength(1);
    });
  });
});
