import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MediaLibrary, UploadAnswer } from "../../src/client/inlineEditing/mediaLibrary";
import type { MediaPicker } from "../../src/client/inlineEditing/mediaPicker";
import type { VeMediaOption, VeMediaOptions } from "../../src/shared/protocol";

import {
  createMediaPicker,
  DATA_VE_MEDIA_PICKER_ATTR,
  MEDIA_NOT_LOADED,
  NO_MEDIA_FOUND,
  SEARCH_PAUSE_MS,
} from "../../src/client/inlineEditing/mediaPicker";

import { flushMutations, waitFor } from "../support/time";

const CMS = "https://cms.example.com";

const FIELD = {
  collectionSlug: "page",
  docId: "1",
  key: "image",
  kind: "collection",
  locale: "en",
} as const;

const media = (id: number, name: string): VeMediaOption => ({
  alt: `A ${name}`,
  filename: `${name}.jpg`,
  id,
  thumbnailUrl: `/api/media/file/${name}-small.jpg`,
  url: `/api/media/file/${name}.jpg`,
});

const HARBOUR = media(1, "harbour");
const LIGHTHOUSE = media(2, "lighthouse");
const PIER = media(3, "pier");

const listed = (documents: VeMediaOption[], hasNextPage = false): VeMediaOptions => ({
  collection: "media",
  documents,
  hasNextPage,
});

const host = () => document.querySelector<HTMLElement>(`[${DATA_VE_MEDIA_PICKER_ATTR}]`);

const part = <Part extends HTMLElement>(selector: string) =>
  host()?.shadowRoot?.querySelector<Part>(selector) as Part;

const button = (action: string) => part<HTMLButtonElement>(`[data-action="${action}"]`);

const options = () => Array.from(part(".grid").querySelectorAll<HTMLButtonElement>("button"));

const names = () => options().map((option) => option.querySelector("span")?.textContent);

const alertText = () => part('[role="alert"]').textContent;

const press = (key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
    ...init,
  });
  (host()?.shadowRoot?.activeElement ?? part('[role="dialog"]')).dispatchEvent(event);
  return event;
};

const search = (text: string) => {
  const input = part<HTMLInputElement>('input[type="search"]');
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

type Held<Answer> = { answer: (value: Answer) => void; promise: Promise<Answer> };

const heldAnswer = <Answer>(): Held<Answer> => {
  const held = {} as Held<Answer>;
  held.promise = new Promise<Answer>((resolve) => {
    held.answer = resolve;
  });
  return held;
};

const chooseFile = (file: File) => {
  const input = part<HTMLInputElement>('input[type="file"]');
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  input.dispatchEvent(new Event("change"));
};

describe("the media picker of a page of its own", () => {
  let list: ReturnType<typeof vi.fn<MediaLibrary["list"]>>;
  let upload: ReturnType<typeof vi.fn<MediaLibrary["upload"]>>;
  let picker: MediaPicker;
  let onUse: ReturnType<typeof vi.fn>;

  const open = async () => {
    picker.open(FIELD, onUse);
    await flushMutations();
  };

  beforeEach(() => {
    document.body.innerHTML = "";
    list = vi.fn<MediaLibrary["list"]>(() => Promise.resolve(listed([HARBOUR, LIGHTHOUSE])));
    upload = vi.fn<MediaLibrary["upload"]>();
    onUse = vi.fn();
    picker = createMediaPicker(document, { list, upload }, (url) => `${CMS}${url}`);
  });

  afterEach(() => {
    picker.remove();
  });

  it("is not on the page until it is opened", () => {
    expect(host()).toBeNull();
  });

  it("is a dialog in a shadow root, with the search focused", async () => {
    await open();

    const dialog = part('[role="dialog"]');
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(part(`#${dialog.getAttribute("aria-labelledby")}`).textContent).toBe("Replace image");
    expect(host()?.shadowRoot?.activeElement).toBe(part('input[type="search"]'));
  });

  it("lists the media of the field with their thumbnails and file names", async () => {
    await open();

    expect(list).toHaveBeenCalledWith({ ...FIELD, page: 1, search: "" });
    expect(names()).toEqual(["harbour.jpg", "lighthouse.jpg"]);
    const thumbnail = options()[0]!.querySelector("img") as HTMLImageElement;
    expect(thumbnail.getAttribute("src")).toBe(`${CMS}/api/media/file/harbour-small.jpg`);
    expect(thumbnail.alt).toBe("A harbour");
  });

  it("writes a file name as text, whatever it holds", async () => {
    list.mockResolvedValue(listed([{ ...HARBOUR, filename: "<img src=x onerror=alert(1)>" }]));

    await open();

    expect(names()).toEqual(["<img src=x onerror=alert(1)>"]);
    expect(options()[0]!.querySelectorAll("img")).toHaveLength(1);
  });

  it("has nothing to use until a document is selected", async () => {
    await open();

    expect(button("use").disabled).toBe(true);

    options()[1]!.click();

    expect(button("use").disabled).toBe(false);
    expect(options().map((option) => option.getAttribute("aria-pressed"))).toEqual([
      "false",
      "true",
    ]);
  });

  it("hands over the selected document and closes on Use selected", async () => {
    await open();
    options()[1]!.click();

    button("use").click();

    expect(onUse).toHaveBeenCalledWith(LIGHTHOUSE);
    expect(host()).toBeNull();
  });

  it("uses the document of a double click", async () => {
    await open();
    options()[0]!.click();

    options()[0]!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

    expect(onUse).toHaveBeenCalledWith(HARBOUR);
  });

  it.each([
    ["Cancel", () => button("cancel").click()],
    ["Escape", () => press("Escape")],
    ["a click beside the dialog", () => part(".backdrop").click()],
  ])("closes on %s and uses nothing", async (_name, dismiss) => {
    await open();
    options()[0]!.click();

    dismiss();

    expect(host()).toBeNull();
    expect(onUse).not.toHaveBeenCalled();
  });

  it("gives the focus back to what had it", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    await open();

    press("Escape");

    expect(document.activeElement).toBe(opener);
  });

  it("keeps the focus inside the dialog on Tab", async () => {
    await open();
    const first = part<HTMLInputElement>('input[type="search"]');
    const last = button("cancel");

    last.focus();
    const forward = press("Tab");
    expect(forward.defaultPrevented).toBe(true);
    expect(host()?.shadowRoot?.activeElement).toBe(first);

    const back = press("Tab", { shiftKey: true });
    expect(back.defaultPrevented).toBe(true);
    expect(host()?.shadowRoot?.activeElement).toBe(last);
  });

  it("searches by file name once the typing pauses", async () => {
    await open();
    list.mockResolvedValue(listed([LIGHTHOUSE]));

    search("li");
    search("light");
    await waitFor(SEARCH_PAUSE_MS + 20);

    expect(list).toHaveBeenCalledTimes(2);
    expect(list).toHaveBeenLastCalledWith({ ...FIELD, page: 1, search: "light" });
    expect(names()).toEqual(["lighthouse.jpg"]);
  });

  it("says so when nothing is found", async () => {
    list.mockResolvedValue(listed([]));

    await open();

    expect(part('[role="status"]').textContent).toBe(NO_MEDIA_FOUND);
  });

  it("adds the next page to the list on Load more", async () => {
    list.mockResolvedValueOnce(listed([HARBOUR], true));
    await open();
    expect(button("more").hidden).toBe(false);
    list.mockResolvedValueOnce(listed([LIGHTHOUSE]));

    button("more").click();
    await flushMutations();

    expect(list).toHaveBeenLastCalledWith({ ...FIELD, page: 2, search: "" });
    expect(names()).toEqual(["harbour.jpg", "lighthouse.jpg"]);
    expect(button("more").hidden).toBe(true);
  });

  it("shows the answer of the search the editor typed last, whichever arrives last", async () => {
    const firstList = heldAnswer<VeMediaOptions>();
    list.mockReturnValueOnce(firstList.promise);
    picker.open(FIELD, onUse);
    list.mockResolvedValueOnce(listed([LIGHTHOUSE]));

    search("light");
    await waitFor(SEARCH_PAUSE_MS + 20);
    firstList.answer(listed([HARBOUR, PIER]));
    await flushMutations();

    expect(names()).toEqual(["lighthouse.jpg"]);
  });

  it("says so when the media cannot be loaded, and offers no upload", async () => {
    list.mockResolvedValue(null);

    await open();

    expect(alertText()).toBe(MEDIA_NOT_LOADED);
    expect(button("upload").disabled).toBe(true);
  });

  describe("Upload new", () => {
    const file = new File(["pixels"], "pier.jpg", { type: "image/jpeg" });

    it("opens the file dialog of the browser", async () => {
      await open();
      const openFileDialog = vi.spyOn(part<HTMLInputElement>('input[type="file"]'), "click");

      button("upload").click();

      expect(openFileDialog).toHaveBeenCalledTimes(1);
    });

    it("uploads the chosen file to the collection of the field and selects the new document", async () => {
      upload.mockResolvedValue({ media: PIER });
      await open();

      chooseFile(file);
      await flushMutations();

      expect(upload).toHaveBeenCalledWith("media", file);
      expect(names()).toEqual(["pier.jpg", "harbour.jpg", "lighthouse.jpg"]);
      expect(options()[0]!.getAttribute("aria-pressed")).toBe("true");

      button("use").click();
      expect(onUse).toHaveBeenCalledWith(PIER);
    });

    it("shows the message of the server when the upload is refused", async () => {
      upload.mockResolvedValue({ error: "The following field is invalid: alt" });
      await open();

      chooseFile(file);
      await flushMutations();

      expect(alertText()).toBe("The following field is invalid: alt");
      expect(names()).toEqual(["harbour.jpg", "lighthouse.jpg"]);
      expect(button("upload").disabled).toBe(false);
    });

    it("takes no second file while one is uploaded", async () => {
      const uploaded = heldAnswer<UploadAnswer>();
      upload.mockReturnValue(uploaded.promise);
      await open();

      chooseFile(file);
      expect(button("upload").disabled).toBe(true);

      uploaded.answer({ media: PIER });
      await flushMutations();
      expect(button("upload").disabled).toBe(false);
    });
  });

  it("starts anew when it is opened again", async () => {
    await open();
    options()[0]!.click();
    press("Escape");

    await open();

    expect(document.querySelectorAll(`[${DATA_VE_MEDIA_PICKER_ATTR}]`)).toHaveLength(1);
    expect(button("use").disabled).toBe(true);
  });
});
