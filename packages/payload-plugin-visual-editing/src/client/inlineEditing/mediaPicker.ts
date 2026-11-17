import type { VeEditedField, VeMediaOption } from "../../shared/protocol.js";
import type { MediaLibrary } from "./mediaLibrary.js";

export interface MediaPicker {
  open(field: VeEditedField, onUse: (media: VeMediaOption) => void): void;
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
    max-height: min(640px, calc(100vh - 32px));
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
  button[data-action="use"] {
    background: var(--ve-on);
    border-color: var(--ve-on);
    color: var(--ve-on-text);
  }
  button[data-action="more"] {
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
  <button type="button" data-action="more" hidden>Load more</button>
  <p role="status"></p>
  <p role="alert"></p>
  <footer>
    <input type="file" accept="${UPLOADED_FILE_TYPES}" hidden>
    <button type="button" data-action="upload" disabled>Upload new</button>
    <span class="spacer"></span>
    <button type="button" data-action="cancel">Cancel</button>
    <button type="button" data-action="use" disabled>Use selected</button>
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
  documents: VeMediaOption[];
  field: VeEditedField;
  focusedBefore: Element | null;
  host: HTMLElement;
  listing: number;
  onUse: (media: VeMediaOption) => void;
  page: number;
  parts: Parts;
  searchPause: ReturnType<typeof setTimeout> | null;
  selected: VeMediaOption | null;
};

const partsOf = (shadow: ShadowRoot): Parts => {
  const part = <Part extends HTMLElement>(selector: string) =>
    shadow.querySelector<Part>(selector) as Part;
  return {
    alert: part('[role="alert"]'),
    backdrop: part(".backdrop"),
    cancel: part('[data-action="cancel"]'),
    file: part('input[type="file"]'),
    grid: part(".grid"),
    more: part('[data-action="more"]'),
    note: part('[role="status"]'),
    search: part('input[type="search"]'),
    upload: part('[data-action="upload"]'),
    use: part('[data-action="use"]'),
  };
};

const withoutMedia = (documents: readonly VeMediaOption[], { id }: VeMediaOption) =>
  documents.filter((listed) => listed.id !== id);

export function createMediaPicker(
  doc: Document,
  library: MediaLibrary,
  absoluteUrlOf: (url: string) => string
): MediaPicker {
  let pick: OpenPick | null = null;

  const close = () => {
    if (!pick) return;
    const { focusedBefore, host, searchPause } = pick;
    if (searchPause !== null) clearTimeout(searchPause);
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

  const showDocuments = (open: OpenPick) => {
    open.parts.grid.replaceChildren(...open.documents.map((media) => optionOf(open, media)));
    open.parts.note.textContent = open.documents.length === 0 ? NO_MEDIA_FOUND : "";
  };

  const list = async (open: OpenPick, page: number) => {
    open.listing += 1;
    const { listing } = open;
    const options = await library.list({ ...open.field, page, search: open.parts.search.value });
    if (pick !== open || open.listing !== listing) return;
    open.parts.alert.textContent = options ? "" : MEDIA_NOT_LOADED;
    if (!options) return;
    const earlier = page === FIRST_PAGE ? [] : open.documents;
    open.page = page;
    open.collection = options.collection;
    open.documents = [...earlier, ...options.documents];
    open.parts.more.hidden = !options.hasNextPage;
    open.parts.upload.disabled = options.collection === null;
    showDocuments(open);
  };

  const listAfterPause = (open: OpenPick) => {
    if (open.searchPause !== null) clearTimeout(open.searchPause);
    open.searchPause = setTimeout(() => void list(open, FIRST_PAGE), SEARCH_PAUSE_MS);
  };

  const uploadChosenFile = async (open: OpenPick) => {
    const [file] = Array.from(open.parts.file.files ?? []);
    const { collection } = open;
    open.parts.file.value = "";
    if (!file || collection === null) return;
    open.parts.upload.disabled = true;
    const answer = await library.upload(collection, file);
    if (pick !== open) return;
    open.parts.upload.disabled = false;
    open.parts.alert.textContent = "error" in answer ? answer.error : "";
    if ("error" in answer) return;
    open.documents = [answer.media, ...withoutMedia(open.documents, answer.media)];
    open.selected = answer.media;
    showDocuments(open);
    select(open, answer.media);
  };

  const keepFocusInside = (open: OpenPick, event: KeyboardEvent) => {
    const shadow = open.host.shadowRoot;
    const focusable = Array.from(shadow?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = focusable.at(0);
    const last = focusable.at(-1);
    const focused = shadow?.activeElement;
    if (!first || !last) return;
    if (event.shiftKey && focused === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && focused === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onKey = (open: OpenPick, event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      keepFocusInside(open, event);
    }
  };

  const mount = (field: VeEditedField, onUse: OpenPick["onUse"]): OpenPick => {
    const host = doc.createElement("div");
    host.setAttribute(DATA_VE_MEDIA_PICKER_ATTR, "");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = TEMPLATE;
    const open: OpenPick = {
      collection: null,
      documents: [],
      field,
      focusedBefore: doc.activeElement,
      host,
      listing: 0,
      onUse,
      page: FIRST_PAGE,
      parts: partsOf(shadow),
      searchPause: null,
      selected: null,
    };
    const { backdrop, cancel, file, more, search, upload, use: useSelected } = open.parts;
    backdrop.addEventListener("click", close);
    cancel.addEventListener("click", close);
    useSelected.addEventListener("click", () => use(open));
    more.addEventListener("click", () => void list(open, open.page + 1));
    search.addEventListener("input", () => listAfterPause(open));
    upload.addEventListener("click", () => file.click());
    file.addEventListener("change", () => void uploadChosenFile(open));
    shadow.addEventListener("keydown", (event) => onKey(open, event as KeyboardEvent));
    doc.body.append(host);
    search.focus();
    return open;
  };

  return {
    open(field, onUse) {
      close();
      pick = mount(field, onUse);
      void list(pick, FIRST_PAGE);
    },
    remove: close,
  };
}
