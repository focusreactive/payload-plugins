import type {
  VeDocument,
  VeEditedField,
  VeEditorState,
  VeRichTextEdit,
  VeRichTextStateRequestMessage,
} from "../../shared/protocol.js";
import type { VeIdentity } from "../../shared/shared.js";
import type { FieldTracker } from "../overlay/fieldTracker.js";
import type { Point } from "./caret.js";
import type { EditSession } from "./richText/editSession.js";

import { readEditedField, readRichTextEdit } from "../../shared/fieldEdit.js";
import { fieldKeyOfMarker } from "../../shared/fieldKey.js";
import { isMessageFrom } from "../../shared/messageSource.js";
import { isPlainObject } from "../../shared/plainObject.js";
import {
  DATA_VE_LIVE_RICH_TEXT_ATTR,
  DATA_VE_PATH_ATTR,
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_RICH_TEXT_STATE_REQUEST_TYPE,
  VE_RICH_TEXT_STATE_TYPE,
  VE_RICH_TEXT_VALUE_PATH,
} from "../../shared/protocol.js";
import { isRichTextNodeKey } from "../../shared/richText/nodeKey.js";
import { readPostedEditorState } from "../../shared/richText/postedEditorState.js";
import { keyedFieldAddressOf, veDocumentOf } from "../../shared/veDocument.js";
import { adminOriginOf, findAdminWindow } from "../adminWindow.js";
import { readMarkerFromAttrs } from "../overlay/markerExtractor.js";
import { hide, readOnlyCopyOf, twinOf } from "./richTextTwin.js";

export type RichTextEditingCtx = {
  adminOrigin: string;
  payloadApi: string;
  locale?: string;
  inlineEditing: boolean;
};

export type RichTextEditingDeps = {
  tracker: FieldTracker;
  getCtx: () => RichTextEditingCtx;
  holdsFormOf: ((document: VeDocument) => boolean) | null;
  send(edit: VeRichTextEdit): void;
  isUnsaved(field: VeEditedField): boolean;
  flush(): void;
  showInForm(field: VeIdentity): void;
  endOtherEdits(): void;
};

export interface RichTextEditing {
  editInPlace(target: HTMLElement, event: MouseEvent): boolean;
  isInsideRichText(target: Element): boolean;
  commit(): void;
  endIfRemoved(): void;
  dispose(): void;
}

type SessionModule = typeof import("./richText/editSession.js");

type Held = { field: VeEditedField; state: VeEditorState };

type ReadOnlyTwin = {
  twin: HTMLElement;
  held: Held;
  showWrapper(): void;
  stopWatching(): void;
};

type Edit = {
  wrapper: HTMLElement;
  twin: HTMLElement;
  field: VeEditedField;
  initial: VeEditorState;
  latest: VeEditorState;
  wasSent: boolean;
  isWrapperRenderedAgain: boolean;
  previous: ReadOnlyTwin | null;
  session: EditSession;
  showAgain(): void;
  stopWatching(): void;
};

const WRAPPER = `[${DATA_VE_PATH_ATTR}]`;
const POINTER_ENTERED = "pointerover";
const WRAPPER_CONTENT = { characterData: true, childList: true, subtree: true };

const addressOf = (field: VeEditedField): string =>
  JSON.stringify([keyedFieldAddressOf(field), field.locale ?? null]);

const isPlainPrimaryClick = (event: MouseEvent): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

const wrapperAround = (element: Element | null): HTMLElement | null =>
  element?.closest<HTMLElement>(WRAPPER) ?? null;

const isEntered = (wrapper: HTMLElement, event: MouseEvent): boolean =>
  !(event.relatedTarget instanceof Node && wrapper.contains(event.relatedTarget));

const stateOfAnswer = async (response: Response): Promise<VeEditorState | null> => {
  const answer: unknown = response.ok ? await response.json() : null;
  return isPlainObject(answer) ? readPostedEditorState(answer.value) : null;
};

export function createRichTextEditing({
  endOtherEdits,
  flush,
  getCtx,
  holdsFormOf,
  isUnsaved,
  send,
  showInForm,
  tracker,
}: RichTextEditingDeps): RichTextEditing {
  const richTextLeaves = new Set<Text>();
  const held = new WeakMap<HTMLElement, Held>();
  const askedOfAdmin = new Map<string, HTMLElement>();
  const askedOfEndpoint = new WeakSet<HTMLElement>();
  const readOnlyTwins = new Map<HTMLElement, ReadOnlyTwin>();
  let sessionModule: SessionModule | null = null;
  let editing: Edit | null = null;
  let isDisposed = false;

  const loadSessionModule = async () => {
    try {
      sessionModule ??= await import("./richText/editSession.js");
    } catch {
      sessionModule = null;
    }
  };

  const showsRichText = (wrapper: HTMLElement): boolean =>
    wrapper.hasAttribute(DATA_VE_LIVE_RICH_TEXT_ATTR) ||
    [...richTextLeaves].some((leaf) => wrapperAround(leaf.parentElement) === wrapper);

  const isInsideRichText = (target: Element): boolean => {
    for (
      let wrapper = wrapperAround(target.parentElement);
      wrapper;
      wrapper = wrapperAround(wrapper.parentElement)
    ) {
      if (showsRichText(wrapper)) return true;
    }
    return false;
  };

  const fieldOf = (wrapper: HTMLElement): VeEditedField | null => {
    const marker = readMarkerFromAttrs(wrapper);
    const key = marker && fieldKeyOfMarker(marker);
    if (!marker || !key || marker.locale !== undefined || isRichTextNodeKey(key)) return null;
    if (!tracker.isIdentifiedByThePage(wrapper) || !showsRichText(wrapper)) return null;
    if (isInsideRichText(wrapper)) return null;
    const { locale } = getCtx();
    return { ...veDocumentOf(marker), key, ...(locale !== undefined && { locale }) };
  };

  const askAdmin = (adminWindow: Window, wrapper: HTMLElement, field: VeEditedField) => {
    if (!holdsFormOf?.(veDocumentOf(field))) return;
    const message: VeRichTextStateRequestMessage = {
      ...field,
      type: VE_RICH_TEXT_STATE_REQUEST_TYPE,
    };
    askedOfAdmin.set(addressOf(field), wrapper);
    adminWindow.postMessage(message, adminOriginOf(getCtx().adminOrigin));
  };

  const fetchState = async (field: VeEditedField): Promise<VeEditorState | null> => {
    try {
      const response = await window.fetch(`${getCtx().payloadApi}${VE_RICH_TEXT_VALUE_PATH}`, {
        body: JSON.stringify(field),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      return await stateOfAnswer(response);
    } catch {
      return null;
    }
  };

  const askEndpoint = async (wrapper: HTMLElement, field: VeEditedField) => {
    if (askedOfEndpoint.has(wrapper)) return;
    askedOfEndpoint.add(wrapper);
    const state = await fetchState(field);
    askedOfEndpoint.delete(wrapper);
    if (state && !isDisposed) held.set(wrapper, { field, state });
  };

  const ask = (wrapper: HTMLElement, field: VeEditedField) => {
    held.delete(wrapper);
    void loadSessionModule();
    const adminWindow = findAdminWindow(window);
    if (adminWindow) askAdmin(adminWindow, wrapper, field);
    else void askEndpoint(wrapper, field);
  };

  const askForEnteredRichText = (event: MouseEvent) => {
    if (!getCtx().inlineEditing || !(event.target instanceof Element)) return;
    for (
      let wrapper = wrapperAround(event.target);
      wrapper && isEntered(wrapper, event);
      wrapper = wrapperAround(wrapper.parentElement)
    ) {
      const field = editing?.wrapper === wrapper ? null : fieldOf(wrapper);
      if (field) ask(wrapper, field);
    }
  };

  const takeAsked = (data: unknown): HTMLElement | null => {
    const field = readEditedField(data);
    const wrapper = field && askedOfAdmin.get(addressOf(field));
    if (!field || !wrapper) return null;
    askedOfAdmin.delete(addressOf(field));
    return wrapper;
  };

  const holdStateOfForm = (data: unknown) => {
    const answer = readRichTextEdit(data);
    const wrapper = takeAsked(data);
    if (!answer || !wrapper) return;
    const { state, ...field } = answer;
    held.set(wrapper, { field, state });
  };

  const hearAdmin = (event: MessageEvent) => {
    const { adminOrigin } = getCtx();
    if (!isMessageFrom(event, adminOriginOf(adminOrigin), findAdminWindow(window))) return;
    const { data } = event;
    if (!isPlainObject(data)) return;
    if (data.type === VE_RICH_TEXT_STATE_TYPE) holdStateOfForm(data);
    if (data.type === VE_FIELD_EDIT_REFUSED_TYPE) takeAsked(data);
  };

  const dropReadOnlyTwin = (wrapper: HTMLElement) => {
    const readOnly = readOnlyTwins.get(wrapper);
    if (!readOnly) return;
    readOnlyTwins.delete(wrapper);
    readOnly.stopWatching();
    readOnly.twin.remove();
    readOnly.showWrapper();
  };

  const keepReadOnly = (ended: Edit, twin: HTMLElement): void => {
    const { previous, wrapper } = ended;
    previous?.stopWatching();
    previous?.twin.remove();
    const shownAgain = new MutationObserver(() => {
      if (editing?.wrapper !== wrapper && !isUnsaved(ended.field)) dropReadOnlyTwin(wrapper);
    });
    shownAgain.observe(wrapper, WRAPPER_CONTENT);
    readOnlyTwins.set(wrapper, {
      held: { field: ended.field, state: ended.latest },
      showWrapper: previous?.showWrapper ?? ended.showAgain,
      stopWatching: () => shownAgain.disconnect(),
      twin,
    });
  };

  const followTyping = (edit: Edit, state: VeEditorState) => {
    edit.latest = state;
    edit.wasSent = true;
    edit.isWrapperRenderedAgain = false;
    send({ ...edit.field, state });
  };

  const end = (keepsWhatWasTyped: boolean) => {
    const ended = editing;
    if (!ended) return;
    editing = null;
    const isShownByThePage = !ended.wasSent || ended.isWrapperRenderedAgain;
    const keepsTwin = keepsWhatWasTyped && !isShownByThePage && !findAdminWindow(window);
    const copy = keepsTwin && ended.twin.isConnected ? readOnlyCopyOf(ended.twin) : null;
    ended.stopWatching();
    ended.session.end();
    if (copy) {
      ended.twin.replaceWith(copy);
      keepReadOnly(ended, copy);
    } else {
      ended.twin.remove();
      ended.showAgain();
      if (keepsWhatWasTyped && ended.isWrapperRenderedAgain) dropReadOnlyTwin(ended.wrapper);
    }
    flush();
  };

  const commit = () => end(true);

  const cancel = () => {
    if (editing?.wasSent) send({ ...editing.field, state: editing.initial });
    end(false);
  };

  const begin = (
    wrapper: HTMLElement,
    { field, state }: Held,
    point: Point,
    previous: ReadOnlyTwin | null
  ): boolean => {
    const marker = readMarkerFromAttrs(wrapper);
    if (!sessionModule || !marker) return false;
    endOtherEdits();
    commit();
    held.delete(wrapper);

    const shown = previous?.twin ?? wrapper;
    const twin = twinOf(wrapper);
    shown.after(twin);
    const showAgain = hide(shown);
    const session = sessionModule.startEditSession({
      onCancel: cancel,
      onChange: (changed) => {
        if (editing?.twin === twin) followTyping(editing, changed);
      },
      onCommit: commit,
      point,
      state,
      twin,
    });
    if (!session) {
      twin.remove();
      showAgain();
      return false;
    }
    const renderedAgain = new MutationObserver(() => {
      if (editing?.twin === twin && editing.wasSent && !isUnsaved(field)) {
        editing.isWrapperRenderedAgain = true;
      }
    });
    renderedAgain.observe(wrapper, WRAPPER_CONTENT);
    editing = {
      field,
      initial: state,
      isWrapperRenderedAgain: false,
      latest: state,
      previous,
      session,
      showAgain,
      stopWatching: () => renderedAgain.disconnect(),
      twin,
      wasSent: false,
      wrapper,
    };
    showInForm({ ...marker, locale: marker.locale ?? getCtx().locale });
    return true;
  };

  const editAgain = (wrapper: HTMLElement, event: MouseEvent): boolean => {
    const readOnly = readOnlyTwins.get(wrapper);
    if (!readOnly || !getCtx().inlineEditing || !isPlainPrimaryClick(event)) return false;
    return begin(wrapper, readOnly.held, { x: event.clientX, y: event.clientY }, readOnly);
  };

  const readOnlyWrapperAt = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof Node)) return null;
    for (const [wrapper, { twin }] of readOnlyTwins) {
      if (twin.contains(target)) return wrapper;
    }
    return null;
  };

  const stopTracking = tracker.subscribe({
    onFields: (_root, matches) => {
      for (const { richText, textNode } of matches) {
        if (richText) richTextLeaves.add(textNode);
      }
    },
    onNodesReleased: (matches) => {
      for (const { textNode } of matches) richTextLeaves.delete(textNode);
    },
  });

  const editClickedTwinAgain = (event: MouseEvent) => {
    const editedBefore = readOnlyWrapperAt(event.target);
    if (!editedBefore || !editAgain(editedBefore, event)) return;
    event.preventDefault();
    event.stopPropagation();
  };

  document.addEventListener(POINTER_ENTERED, askForEnteredRichText);
  document.addEventListener("click", editClickedTwinAgain);
  window.addEventListener("message", hearAdmin);

  return {
    commit,
    dispose() {
      commit();
      isDisposed = true;
      for (const wrapper of [...readOnlyTwins.keys()]) dropReadOnlyTwin(wrapper);
      document.removeEventListener(POINTER_ENTERED, askForEnteredRichText);
      document.removeEventListener("click", editClickedTwinAgain);
      window.removeEventListener("message", hearAdmin);
      stopTracking();
    },
    editInPlace(target, event) {
      if (editing?.twin.contains(event.target as Node | null)) return true;
      const editedBefore = readOnlyWrapperAt(event.target);
      if (editedBefore) return editAgain(editedBefore, event);
      const ready = held.get(target);
      if (!ready || !fieldOf(target)) return false;
      return begin(target, ready, { x: event.clientX, y: event.clientY }, null);
    },
    endIfRemoved() {
      if (editing && !editing.twin.isConnected) commit();
      for (const wrapper of [...readOnlyTwins.keys()]) {
        if (!wrapper.isConnected) dropReadOnlyTwin(wrapper);
      }
    },
    isInsideRichText,
  };
}
