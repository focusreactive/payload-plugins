import type { VeEditedField, VeMediaOption } from "../../shared/protocol.js";
import type { MediaLibrary } from "./mediaLibrary.js";

import { DATA_VE_LAYER_ATTR } from "../overlay/constants.js";
import { FIELD_REFUSED } from "./mediaLibrary.js";

export interface MediaPicker {
  open(field: VeEditedField, onUse: (media: VeMediaOption) => void, onRefused: () => void): void;
  remove(): void;
}

export const DATA_VE_MEDIA_PICKER_ATTR = "data-ve-media-picker";

export const SEARCH_PAUSE_MS = 250;

export const MEDIA_NOT_LOADED = "The media could not be loaded";
export const NO_MEDIA_FOUND = "No media found";

const FIRST_PAGE = 1;
const SELECTED_ATTR = "aria-pressed";
const MEDIA_ID_ATTR = "data-media-id";
const UPLOADED_FILE_TYPES = "image/*";
const FOCUSABLE = "input:not([type='file']), button:not([disabled]):not([hidden])";
const KEY_PRESSED = "keydown";
const IN_CAPTURE_PHASE = true;
const LOAD_MORE = "more";
const UPLOAD_NEW = "upload";
const CANCEL = "cancel";
const USE_SELECTED = "use";

const actionSelector = (action: string) => `[data-action="${action}"]`;

const TEMPLATE = `
<style>
  :host {
    all: initial;
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    --ve-surface: #ffffff;
    --ve-border: rgba(0, 0, 0, 0.12);
    --ve-track: rgba(0, 0, 0, 0.05);
    --ve-text: #141414;
    --ve-muted: #6b6b6b;
    --ve-on: var(--ve-accent, #7c3aed);
    --ve-on-text: var(--ve-accent-text, #ffffff);
    --ve-danger: #b91c1c;
  }
  @media (prefers-color-scheme: dark) {
    :host {
      --ve-surface: #222222;
      --ve-border: rgba(255, 255, 255, 0.14);
      --ve-track: rgba(255, 255, 255, 0.06);
      --ve-text: #f5f5f5;
      --ve-muted: #a3a3a3;
      --ve-danger: #f87171;
    }
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
  }
  [role="dialog"] {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-sizing: border-box;
    width: min(760px, calc(100vw - 32px));
    height: min(640px, calc(100vh - 32px));
    padding: 16px;
    background: var(--ve-surface);
    border: 1px solid var(--ve-border);
    border-radius: 10px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08), 0 24px 48px -12px rgba(0, 0, 0, 0.3);
    color: var(--ve-text);
    font: 400 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  header, footer {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  h2 {
    flex: 1;
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }
  input[type="search"] {
    box-sizing: border-box;
    width: 240px;
    max-width: 50%;
    padding: 7px 10px;
    background: var(--ve-surface);
    border: 1px solid var(--ve-border);
    border-radius: 6px;
    color: inherit;
    font: inherit;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    align-content: start;
    flex: 1;
    gap: 8px;
    min-height: 120px;
    overflow-y: auto;
    padding: 2px;
  }
  .grid button {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
    background: var(--ve-track);
    border: 2px solid transparent;
    text-align: left;
  }
  .grid button[${SELECTED_ATTR}="true"] {
    border-color: var(--ve-on);
  }
  .grid img {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    border-radius: 4px;
    background: var(--ve-track);
  }
  .grid span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--ve-muted);
    font-size: 12px;
  }
  p {
    margin: 0;
    color: var(--ve-muted);
  }
  p:empty {
    display: none;
  }
  [role="alert"] {
    color: var(--ve-danger);
  }
  .spacer {
    flex: 1;
  }
  button {
    appearance: none;
    margin: 0;
    padding: 7px 12px;
    background: var(--ve-track);
    border: 1px solid var(--ve-border);
    border-radius: 6px;
    color: inherit;
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  button${actionSelector(USE_SELECTED)} {
    background: var(--ve-on);
    border-color: var(--ve-on);
    color: var(--ve-on-text);
  }
  button${actionSelector(LOAD_MORE)} {
    align-self: center;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  button[hidden] {
    display: none;
  }
  button:focus-visible, input:focus-visible {
    outline: 2px solid var(--ve-on);
    outline-offset: 1px;
  }
</style>
<div class="backdrop"></div>
<div role="dialog" aria-modal="true" aria-labelledby="ve-media-picker-title">
  <header>
    <h2 id="ve-media-picker-title">Replace image</h2>
    <input type="search" placeholder="Search by file name" aria-label="Search by file name">
  </header>
  <div class="grid" role="group" aria-label="Media"></div>
  <button type="button" data-action="${LOAD_MORE}" hidden>Load more</button>
  <p role="status"></p>
  <p role="alert"></p>
  <footer>
    <input type="file" accept="${UPLOADED_FILE_TYPES}" hidden>
    <button type="button" data-action="${UPLOAD_NEW}" disabled>Upload new</button>
    <span class="spacer"></span>
    <button type="button" data-action="${CANCEL}">Cancel</button>
    <button type="button" data-action="${USE_SELECTED}" disabled>Use selected</button>
  </footer>
</div>
`;

type Parts = {
  alert: HTMLElement;
  backdrop: HTMLElement;
  cancel: HTMLButtonElement;
  file: HTMLInputElement;
  grid: HTMLElement;
  more: HTMLButtonElement;
  note: HTMLElement;
  search: HTMLInputElement;
  upload: HTMLButtonElement;
  use: HTMLButtonElement;
};

type OpenPick = {
  collection: string | null;
  descriptionField: string | null;
  documents: VeMediaOption[];
  field: VeEditedField;
  focusedBefore: Element | null;
  host: HTMLElement;
  listing: number;
  onRefused: () => void;
  onUse: (media: VeMediaOption) => void;
  page: number;
  parts: Parts;
  searchPause: ReturnType<typeof setTimeout> | null;
  selected: VeMediaOption | null;
  stopListeningToKeys: () => void;
};

const partsOf = (shadow: ShadowRoot): Parts => {
  const part = <Part extends HTMLElement>(selector: string) =>
    shadow.querySelector<Part>(selector) as Part;
  return {
    alert: part('[role="alert"]'),
    backdrop: part(".backdrop"),
    cancel: part(actionSelector(CANCEL)),
    file: part('input[type="file"]'),
    grid: part(".grid"),
    more: part(actionSelector(LOAD_MORE)),
    note: part('[role="status"]'),
    search: part('input[type="search"]'),
    upload: part(actionSelector(UPLOAD_NEW)),
    use: part(actionSelector(USE_SELECTED)),
  };
};

const stopNothing = (): void => undefined;

const withSelectedListed = (
  documents: readonly VeMediaOption[],
  selected: VeMediaOption | null
): VeMediaOption[] => {
  const isListed = selected === null || documents.some(({ id }) => id === selected.id);
  return isListed ? [...documents] : [selected, ...documents];
};

export function createMediaPicker(
  doc: Document,
  library: MediaLibrary,
  absoluteUrlOf: (url: string) => string
): MediaPicker {
  let pick: OpenPick | null = null;

  const close = () => {
    if (!pick) return;
    const { focusedBefore, host, searchPause, stopListeningToKeys } = pick;
    if (searchPause !== null) clearTimeout(searchPause);
    stopListeningToKeys();
    pick = null;
    host.remove();
    if (focusedBefore instanceof HTMLElement) focusedBefore.focus();
  };

  const select = (open: OpenPick, media: VeMediaOption | null) => {
    open.selected = media;
    open.parts.use.disabled = media === null;
    for (const option of Array.from(open.parts.grid.children)) {
      const isSelected = media !== null && option.getAttribute(MEDIA_ID_ATTR) === String(media.id);
      option.setAttribute(SELECTED_ATTR, String(isSelected));
    }
  };

  const use = (open: OpenPick) => {
    const { onUse, selected } = open;
    if (!selected) return;
    close();
    onUse(selected);
  };

  const optionOf = (open: OpenPick, media: VeMediaOption): HTMLElement => {
    const option = doc.createElement("button");
    option.type = "button";
    option.setAttribute(MEDIA_ID_ATTR, String(media.id));
    option.setAttribute(SELECTED_ATTR, String(open.selected?.id === media.id));
    option.title = media.filename;
    const thumbnail = doc.createElement("img");
    thumbnail.loading = "lazy";
    thumbnail.alt = media.alt ?? "";
    thumbnail.src = absoluteUrlOf(media.thumbnailUrl);
    const name = doc.createElement("span");
    name.textContent = media.filename;
    option.append(thumbnail, name);
    option.addEventListener("click", () => select(open, media));
    option.addEventListener("dblclick", () => use(open));
    return option;
  };

  const focusableIn = (open: OpenPick): HTMLElement[] =>
    Array.from(open.host.shadowRoot?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

  const takeFocusBack = (open: OpenPick): boolean => {
    const focusable = focusableIn(open);
    const focused = open.host.shadowRoot?.activeElement;
    if (focused && focusable.includes(focused as HTMLElement)) return false;
    focusable.at(0)?.focus();
    return true;
  };

  const optionIn = (open: OpenPick, mediaId: VeMediaOption["id"] | null): HTMLElement | null => {
    if (mediaId === null) return null;
    const options = Array.from(open.parts.grid.querySelectorAll<HTMLElement>(`[${MEDIA_ID_ATTR}]`));
    return options.find((option) => option.getAttribute(MEDIA_ID_ATTR) === String(mediaId)) ?? null;
  };

  const focusedMediaIdOf = (open: OpenPick): string | null =>
    open.host.shadowRoot?.activeElement?.getAttribute(MEDIA_ID_ATTR) ?? null;

  const showDocuments = (open: OpenPick, focused?: VeMediaOption["id"]) => {
    const toFocus = focused ?? focusedMediaIdOf(open);
    open.parts.grid.replaceChildren(...open.documents.map((media) => optionOf(open, media)));
    open.parts.note.textContent = open.documents.length === 0 ? NO_MEDIA_FOUND : "";
    optionIn(open, toFocus)?.focus();
  };

  const list = async (open: OpenPick, page: number) => {
    open.listing += 1;
    const { listing } = open;
    const options = await library.list({ ...open.field, page, search: open.parts.search.value });
    if (pick !== open || open.listing !== listing) return;
    if (options === FIELD_REFUSED) {
      close();
      open.onRefused();
      return;
    }
    open.parts.alert.textContent = options ? "" : MEDIA_NOT_LOADED;
    if (!options) return;
    const earlier = page === FIRST_PAGE ? [] : open.documents;
    const firstAdded = options.documents.find(
      ({ id }) => !earlier.some((media) => media.id === id)
    );
    open.page = page;
    open.collection = options.collection;
    open.descriptionField = options.descriptionField;
    open.documents = withSelectedListed([...earlier, ...options.documents], open.selected);
    open.parts.more.hidden = !options.hasNextPage;
    open.parts.upload.disabled = options.collection === null;
    if (page === FIRST_PAGE) {
      showDocuments(open);
      return;
    }
    showDocuments(open, firstAdded?.id);
    takeFocusBack(open);
  };

  const listAfterPause = (open: OpenPick) => {
    if (open.searchPause !== null) clearTimeout(open.searchPause);
    open.searchPause = setTimeout(() => void list(open, FIRST_PAGE), SEARCH_PAUSE_MS);
  };

  const uploadChosenFile = async (open: OpenPick) => {
    const [file] = Array.from(open.parts.file.files ?? []);
    const { collection, descriptionField } = open;
    open.parts.file.value = "";
    if (!file || collection === null) return;
    open.parts.upload.disabled = true;
    const answer = await library.upload(collection, descriptionField, file);
    if (pick !== open) return;
    open.parts.upload.disabled = false;
    open.parts.alert.textContent = "error" in answer ? answer.error : "";
    if ("error" in answer) return;
    open.parts.search.value = "";
    open.selected = answer.media;
    open.documents = withSelectedListed(open.documents, answer.media);
    showDocuments(open, answer.media.id);
    select(open, answer.media);
    await list(open, FIRST_PAGE);
    if (pick === open) takeFocusBack(open);
  };

  const keepFocusInside = (open: OpenPick, event: KeyboardEvent) => {
    const focusable = focusableIn(open);
    const first = focusable.at(0);
    const last = focusable.at(-1);
    const focused = open.host.shadowRoot?.activeElement;
    if (!first || !last) return;
    if (event.shiftKey && focused === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && focused === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onKeyOfThePage = (open: OpenPick, event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    const wasOutside = takeFocusBack(open);
    if (event.key !== "Tab") return;
    if (wasOutside) event.preventDefault();
    else keepFocusInside(open, event);
  };

  const mount = (
    field: VeEditedField,
    onUse: OpenPick["onUse"],
    onRefused: OpenPick["onRefused"]
  ): OpenPick => {
    const host = doc.createElement("div");
    host.setAttribute(DATA_VE_MEDIA_PICKER_ATTR, "");
    host.setAttribute(DATA_VE_LAYER_ATTR, "media-picker");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = TEMPLATE;
    const open: OpenPick = {
      collection: null,
      descriptionField: null,
      documents: [],
      field,
      focusedBefore: doc.activeElement,
      host,
      listing: 0,
      onRefused,
      onUse,
      page: FIRST_PAGE,
      parts: partsOf(shadow),
      searchPause: null,
      selected: null,
      stopListeningToKeys: stopNothing,
    };
    const hearKey = (event: KeyboardEvent) => onKeyOfThePage(open, event);
    open.stopListeningToKeys = () =>
      doc.removeEventListener(KEY_PRESSED, hearKey, IN_CAPTURE_PHASE);
    const { backdrop, cancel, file, more, search, upload, use: useSelected } = open.parts;
    backdrop.addEventListener("click", close);
    cancel.addEventListener("click", close);
    useSelected.addEventListener("click", () => use(open));
    more.addEventListener("click", () => void list(open, open.page + 1));
    search.addEventListener("input", () => listAfterPause(open));
    upload.addEventListener("click", () => file.click());
    file.addEventListener("change", () => void uploadChosenFile(open));
    doc.addEventListener(KEY_PRESSED, hearKey, IN_CAPTURE_PHASE);
    doc.body.append(host);
    search.focus();
    return open;
  };

  return {
    open(field, onUse, onRefused) {
      close();
      pick = mount(field, onUse, onRefused);
      void list(pick, FIRST_PAGE);
    },
    remove: close,
  };
}
