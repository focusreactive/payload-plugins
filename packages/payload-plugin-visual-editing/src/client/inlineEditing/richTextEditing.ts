import type {
  VeDocument,
  VeEditedField,
  VeEditorState,
  VeRichTextEdit,
  VeRichTextEditEndedMessage,
  VeRichTextStateRequestMessage,
} from "../../shared/protocol.js";
import type { VeRichTextFormats } from "../../shared/richText/formats.js";
import type { FieldTracker } from "../overlay/fieldTracker.js";
import type { Point, TextPosition } from "./caret.js";
import type { EditRoutes } from "./editRoutes.js";
import type { PageFields } from "./pageFields.js";
import type { EditSession, RichTextEditor, RichTextEditorLoader } from "./richTextEditor.js";

import { readEditedField, readRichTextEdit } from "../../shared/fieldEdit.js";
import { isMessageFrom } from "../../shared/messageSource.js";
import { isPlainObject } from "../../shared/plainObject.js";
import {
  DATA_VE_LIVE_RICH_TEXT_ATTR,
  DATA_VE_PATH_ATTR,
  VE_DOCUMENT_SAVED_TYPE,
  VE_FIELD_PATCH_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_RICH_TEXT_EDIT_ENDED_TYPE,
  VE_RICH_TEXT_STATE_REFUSED_TYPE,
  VE_RICH_TEXT_STATE_REQUEST_TYPE,
  VE_RICH_TEXT_STATE_TYPE,
  VE_RICH_TEXT_STRUCTURE_TYPE,
  VE_RICH_TEXT_VALUE_PATH,
} from "../../shared/protocol.js";
import { fixedNodesOf } from "../../shared/richText/editableNodes.js";
import { readFormats } from "../../shared/richText/formats.js";
import { isRichTextNodeKey } from "../../shared/richText/nodeKey.js";
import { readPostedEditorState } from "../../shared/richText/postedEditorState.js";
import {
  documentAddressOf,
  isVeDocument,
  editedFieldAddressOf,
  veDocumentOf,
} from "../../shared/veDocument.js";
import { adminOriginOf, findAdminWindow } from "../adminWindow.js";
import { readMarkerFromAttrs } from "../overlay/markerExtractor.js";
import { textPositionAtPoint } from "./caret.js";
import { endpointAnswerOf } from "./endpointAnswer.js";
import { isPageField } from "./pageFields.js";
import { editorOf } from "./richTextEditor.js";
import {
  contentOf,
  editableTextsIn,
  hide,
  readOnlyCopyOf,
  showAsStarting,
  twinOf,
} from "./richTextTwin.js";

export type RichTextEditingCtx = {
  adminOrigin: string;
  payloadApi: string;
  locale?: string;
  inlineEditing: boolean;
  richTextEditor?: RichTextEditorLoader;
};

export type RichTextEditingDeps = {
  tracker: FieldTracker;
  getCtx: () => RichTextEditingCtx;
  pageFields: PageFields;
  send(edit: VeRichTextEdit, onDelivered?: () => void): void;
  holdUnsaved(edit: VeRichTextEdit): void;
  dropUnsaved(field: VeEditedField): void;
  isUnsaved(field: VeEditedField): boolean;
  flush(): void;
  endOtherEdits(): void;
  routes: EditRoutes;
};

export interface RichTextEditing {
  editInPlace(target: HTMLElement, event: MouseEvent, openField: () => void): boolean;
  isInsideRichText(target: Element): boolean;
  commit(): void;
  commitBeforeThePageIsHidden(): void;
  endIfRemoved(): void;
  dispose(): void;
}

export const RICH_TEXT_STATE_TIME_LIMIT_MS = 4000;

export const RICH_TEXT_CHECK_PAUSE_MS = 200;

export const RICH_TEXT_STATE_FRESH_MS = 2000;

type Held = { field: VeEditedField; state: VeEditorState; formats: VeRichTextFormats };

type ReadOnlyTwin = {
  twin: HTMLElement;
  held: Held;
  showWrapper(): void;
  stopWatching(): void;
};

type Edit = {
  wrapper: HTMLElement;
  twin: HTMLElement;
  held: Held;
  latest: VeEditorState;
  wasChanged: boolean;
  wasDelivered: boolean;
  showsWhatWasSaved: boolean;
  stopWatchingWrapper(): void;
  previous: ReadOnlyTwin | null;
  session: EditSession;
  showAgain(): void;
};

type WaitingClick = {
  wrapper: HTMLElement;
  field: VeEditedField;
  address: string;
  caret: TextPosition | null;
  openField(): void;
  showAsWaited(): void;
  timer: ReturnType<typeof setTimeout>;
};

const WRAPPER = `[${DATA_VE_PATH_ATTR}]`;
const POINTER_EVENTS = ["pointerover", "pointermove"] as const;
const WRAPPER_CONTENT = { characterData: true, childList: true, subtree: true };
const NEWS_OF_A_DOCUMENT: ReadonlySet<unknown> = new Set([
  VE_RICH_TEXT_STRUCTURE_TYPE,
  VE_FIELD_PATCH_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_DOCUMENT_SAVED_TYPE,
]);

const isPlainPrimaryClick = (event: MouseEvent): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

const pointOf = ({ clientX, clientY }: MouseEvent): Point => ({ x: clientX, y: clientY });

const wrapperAround = (element: Element | null): HTMLElement | null =>
  element?.closest<HTMLElement>(WRAPPER) ?? null;

const heldOf = (field: VeEditedField, answer: unknown): Held | null => {
  if (!isPlainObject(answer)) return null;
  const state = readPostedEditorState(answer.state ?? answer.value);
  const formats = readFormats(answer.formats);
  return state && formats ? { field, formats, state } : null;
};

const holdsEveryFixedNode = ({ held }: Edit, state: VeEditorState): boolean =>
  fixedNodesOf(state).length === fixedNodesOf(held.state).length;

const clickWrapperInstead = (wrapper: HTMLElement, event: MouseEvent) => {
  const { clientX, clientY } = event;
  const click = new MouseEvent("click", { bubbles: true, cancelable: true, clientX, clientY });
  if (!wrapper.dispatchEvent(click)) event.preventDefault();
};

export function createRichTextEditing({
  dropUnsaved,
  endOtherEdits,
  flush,
  getCtx,
  holdUnsaved,
  isUnsaved,
  pageFields,
  routes,
  send,
  tracker,
}: RichTextEditingDeps): RichTextEditing {
  const { adminOf } = routes;
  const richTextLeaves = new Set<Text>();
  const held = new Map<string, Held>();
  const heldAt = new Map<string, number>();
  const askedAt = new Map<string, number>();
  const checkedAt = new WeakMap<HTMLElement, number>();
  const readOnlyTwins = new Map<HTMLElement, ReadOnlyTwin>();
  let editor: RichTextEditor | null = null;
  let editorLoad: Promise<void> | null = null;
  let editing: Edit | null = null;
  let waitingClick: WaitingClick | null = null;
  let isDisposed = false;

  const isOffered = (): boolean => {
    const { inlineEditing, richTextEditor } = getCtx();
    return inlineEditing && richTextEditor !== undefined;
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
    const answer = marker && pageFields.editableFieldOf(marker, "rich-text");
    if (!answer || !isPageField(answer) || isRichTextNodeKey(answer.field.key)) return null;
    if (!tracker.isIdentifiedByThePage(wrapper) || !showsRichText(wrapper)) return null;
    return isInsideRichText(wrapper) ? null : answer.field;
  };

  const isBeingAsked = (address: string): boolean => {
    const asked = askedAt.get(address);
    return asked !== undefined && Date.now() - asked < RICH_TEXT_STATE_TIME_LIMIT_MS;
  };

  const stopWaiting = (): WaitingClick | null => {
    const waited = waitingClick;
    waitingClick = null;
    if (waited) clearTimeout(waited.timer);
    waited?.showAsWaited();
    return waited;
  };

  const openFieldInstead = () => {
    stopWaiting()?.openField();
  };

  const forget = (address: string) => {
    held.delete(address);
    heldAt.delete(address);
    askedAt.delete(address);
  };

  const freshlyHeld = (address: string): Held | null => {
    const at = heldAt.get(address);
    const isFresh =
      routes.currentAdmin() !== null ||
      (at !== undefined && Date.now() - at < RICH_TEXT_STATE_FRESH_MS);
    return isFresh ? (held.get(address) ?? null) : null;
  };

  const refuse = (address: string) => {
    forget(address);
    if (waitingClick?.address === address) openFieldInstead();
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
      if (editing?.wrapper !== wrapper && !isUnsaved(ended.held.field)) dropReadOnlyTwin(wrapper);
    });
    shownAgain.observe(wrapper, WRAPPER_CONTENT);
    readOnlyTwins.set(wrapper, {
      held: { ...ended.held, state: ended.latest },
      showWrapper: previous?.showWrapper ?? ended.showAgain,
      stopWatching: () => shownAgain.disconnect(),
      twin,
    });
  };

  const followTyping = (edit: Edit, state: VeEditorState) => {
    edit.latest = state;
    edit.wasChanged = true;
    edit.showsWhatWasSaved = false;
    const change = { ...edit.held.field, base: edit.held.state, state };
    if (adminOf(edit.held.field) || holdsEveryFixedNode(edit, state)) {
      send(change, () => {
        edit.wasDelivered = true;
      });
    } else {
      holdUnsaved(change);
    }
  };

  const tellAdminTheEditEnded = (field: VeEditedField) => {
    const message: VeRichTextEditEndedMessage = { ...field, type: VE_RICH_TEXT_EDIT_ENDED_TYPE };
    adminOf(field)?.postMessage(message, adminOriginOf(getCtx().adminOrigin));
  };

  const end = (keepsWhatWasTyped: boolean) => {
    const ended = editing;
    if (!ended) return;
    editing = null;
    forget(editedFieldAddressOf(ended.held.field));
    const isOnThePage = ended.twin.isConnected && ended.wrapper.isConnected;
    ended.stopWatchingWrapper();
    const keepsTwin =
      keepsWhatWasTyped &&
      isOnThePage &&
      ended.wasChanged &&
      !ended.showsWhatWasSaved &&
      !adminOf(ended.held.field);
    const copy = keepsTwin ? readOnlyCopyOf(ended.twin) : null;
    ended.session.end();
    if (copy) {
      ended.twin.replaceWith(copy);
      keepReadOnly(ended, copy);
    } else {
      ended.twin.remove();
      ended.showAgain();
      if (ended.showsWhatWasSaved) dropReadOnlyTwin(ended.wrapper);
    }
    flush();
    tellAdminTheEditEnded(ended.held.field);
  };

  const commit = () => end(true);

  const takeBack = ({ held: { field, state }, wasDelivered }: Edit) => {
    dropUnsaved(field);
    if (adminOf(field) || wasDelivered) send({ ...field, base: state, state });
  };

  const cancel = () => {
    if (editing?.wasChanged) takeBack(editing);
    end(false);
  };

  const caretAt = (shown: HTMLElement, point: Point): TextPosition | null =>
    textPositionAtPoint(shown.ownerDocument, editableTextsIn(shown, richTextLeaves), point);

  const startSession = (
    twin: HTMLElement,
    content: HTMLElement,
    { formats, state }: Held,
    rendered: HTMLElement,
    caret: TextPosition | null
  ) => {
    try {
      return (
        editor?.startEditSession({
          caret,
          formats,
          onCancel: cancel,
          onChange: (changed) => {
            if (editing?.twin === twin) followTyping(editing, changed);
          },
          onCommit: commit,
          rendered,
          state,
          twin: content,
        }) ?? null
      );
    } catch {
      return null;
    }
  };

  const begin = (
    wrapper: HTMLElement,
    ready: Held,
    caret: TextPosition | null,
    previous: ReadOnlyTwin | null
  ): boolean => {
    const marker = readMarkerFromAttrs(wrapper);
    if (!marker) return false;
    endOtherEdits();
    commit();
    forget(editedFieldAddressOf(ready.field));
    routes.beginEdit(ready.field, isUnsaved);

    const shown = previous?.twin ?? wrapper;
    const { content, root: twin } = twinOf(wrapper, ready.state);
    shown.after(twin);
    const showAgain = hide(shown);
    const session = startSession(twin, content, ready, contentOf(shown, ready.state), caret);
    if (!session) {
      twin.remove();
      showAgain();
      return false;
    }
    const rendersOfTheSite = new MutationObserver(() => {
      if (editing?.wrapper === wrapper) editing.showsWhatWasSaved = !isUnsaved(ready.field);
    });
    rendersOfTheSite.observe(wrapper, WRAPPER_CONTENT);
    editing = {
      held: ready,
      latest: ready.state,
      previous,
      session,
      showAgain,
      showsWhatWasSaved: false,
      stopWatchingWrapper: () => rendersOfTheSite.disconnect(),
      twin,
      wasChanged: false,
      wasDelivered: false,
      wrapper,
    };
    return true;
  };

  const beginWaitingEdit = () => {
    const ready = waitingClick && held.get(waitingClick.address);
    if (!waitingClick || !ready || !editor) return;
    const { caret, openField, wrapper } = waitingClick;
    stopWaiting();
    if (!wrapper.isConnected || !begin(wrapper, ready, caret, null)) openField();
  };

  const loadedEditorOf = async (load: RichTextEditorLoader): Promise<RichTextEditor | null> => {
    try {
      return editorOf(await load());
    } catch {
      return null;
    }
  };

  const takeLoadedEditor = async (load: RichTextEditorLoader) => {
    editor = await loadedEditorOf(load);
    if (editor) {
      beginWaitingEdit();
      return;
    }
    editorLoad = null;
    openFieldInstead();
  };

  const loadEditor = () => {
    const { richTextEditor } = getCtx();
    if (!editor && !editorLoad && richTextEditor) editorLoad = takeLoadedEditor(richTextEditor);
  };

  const hold = (address: string, answer: Held | null) => {
    if (isDisposed) return;
    if (!answer) {
      refuse(address);
      return;
    }
    askedAt.delete(address);
    held.set(address, answer);
    heldAt.set(address, Date.now());
    beginWaitingEdit();
  };

  const askAdmin = (adminWindow: Window, field: VeEditedField) => {
    const message: VeRichTextStateRequestMessage = {
      ...field,
      type: VE_RICH_TEXT_STATE_REQUEST_TYPE,
    };
    adminWindow.postMessage(message, adminOriginOf(getCtx().adminOrigin));
  };

  const askEndpoint = async (field: VeEditedField) => {
    try {
      const response = await window.fetch(`${getCtx().payloadApi}${VE_RICH_TEXT_VALUE_PATH}`, {
        body: JSON.stringify(field),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const { answer, refusal } = await endpointAnswerOf(response);
      hold(editedFieldAddressOf(field), refusal === null ? heldOf(field, answer) : null);
    } catch {
      hold(editedFieldAddressOf(field), null);
    }
  };

  const ask = (field: VeEditedField) => {
    askedAt.set(editedFieldAddressOf(field), Date.now());
    loadEditor();
    const adminWindow = routes.currentAdmin();
    if (adminWindow) askAdmin(adminWindow, field);
    else void askEndpoint(field);
  };

  const askUnlessHeld = (field: VeEditedField) => {
    const address = editedFieldAddressOf(field);
    if (!held.has(address) && !isBeingAsked(address)) ask(field);
  };

  const forgetDocument = (document: VeDocument | null) => {
    for (const [address, { field }] of held) {
      if (!document || documentAddressOf(field) === documentAddressOf(document)) forget(address);
    }
    if (waitingClick) askUnlessHeld(waitingClick.field);
  };

  const isEdited = (field: VeEditedField): boolean =>
    editing !== null && editedFieldAddressOf(editing.held.field) === editedFieldAddressOf(field);

  const isCheckedLately = (wrapper: HTMLElement): boolean => {
    const checked = checkedAt.get(wrapper);
    return checked !== undefined && Date.now() - checked < RICH_TEXT_CHECK_PAUSE_MS;
  };

  const askForRichTextUnderThePointer = (event: MouseEvent) => {
    if (!isOffered() || !(event.target instanceof Element)) return;
    for (
      let wrapper = wrapperAround(event.target);
      wrapper;
      wrapper = wrapperAround(wrapper.parentElement)
    ) {
      if (editing?.wrapper === wrapper || isCheckedLately(wrapper)) continue;
      checkedAt.set(wrapper, Date.now());
      const field = fieldOf(wrapper);
      if (field && !isEdited(field)) askUnlessHeld(field);
    }
  };

  const hearAdmin = (event: MessageEvent) => {
    const { adminOrigin } = getCtx();
    if (!isMessageFrom(event, adminOriginOf(adminOrigin), findAdminWindow(window))) return;
    const { data } = event;
    if (!isPlainObject(data)) return;
    const field = readEditedField(data);
    if (data.type === VE_RICH_TEXT_STATE_TYPE && field) {
      hold(editedFieldAddressOf(field), readRichTextEdit(data) && heldOf(field, data));
    } else if (data.type === VE_RICH_TEXT_STATE_REFUSED_TYPE && field) {
      refuse(editedFieldAddressOf(field));
    } else if (NEWS_OF_A_DOCUMENT.has(data.type)) {
      forgetDocument(isVeDocument(data) ? veDocumentOf(data) : null);
    }
  };

  const editAgain = (wrapper: HTMLElement, event: MouseEvent): boolean => {
    const readOnly = readOnlyTwins.get(wrapper);
    if (!readOnly || !isOffered() || !isPlainPrimaryClick(event)) return false;
    return begin(wrapper, readOnly.held, caretAt(readOnly.twin, pointOf(event)), readOnly);
  };

  const readOnlyWrapperAt = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof Node)) return null;
    for (const [wrapper, { twin }] of readOnlyTwins) {
      if (twin.contains(target)) return wrapper;
    }
    return null;
  };

  const waitForState = (
    wrapper: HTMLElement,
    field: VeEditedField,
    event: MouseEvent,
    openField: () => void
  ) => {
    waitingClick = {
      address: editedFieldAddressOf(field),
      caret: caretAt(wrapper, pointOf(event)),
      field,
      openField,
      showAsWaited: showAsStarting(wrapper),
      timer: setTimeout(openFieldInstead, RICH_TEXT_STATE_TIME_LIMIT_MS),
      wrapper,
    };
    askUnlessHeld(field);
    loadEditor();
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
    if (!editedBefore) return;
    if (editAgain(editedBefore, event)) {
      event.preventDefault();
      event.stopPropagation();
    } else if (!isOffered() && isPlainPrimaryClick(event)) {
      clickWrapperInstead(editedBefore, event);
    }
  };

  for (const name of POINTER_EVENTS) document.addEventListener(name, askForRichTextUnderThePointer);
  document.addEventListener("click", editClickedTwinAgain);
  window.addEventListener("message", hearAdmin);

  return {
    commit,
    commitBeforeThePageIsHidden() {
      if (editing && !adminOf(editing.held.field)) commit();
    },
    dispose() {
      commit();
      stopWaiting();
      isDisposed = true;
      for (const wrapper of [...readOnlyTwins.keys()]) dropReadOnlyTwin(wrapper);
      for (const name of POINTER_EVENTS) {
        document.removeEventListener(name, askForRichTextUnderThePointer);
      }
      document.removeEventListener("click", editClickedTwinAgain);
      window.removeEventListener("message", hearAdmin);
      stopTracking();
    },
    editInPlace(target, event, openField) {
      if (editing?.twin.contains(event.target as Node | null)) return true;
      const editedBefore = readOnlyWrapperAt(event.target);
      if (editedBefore) return editAgain(editedBefore, event);
      const field = isOffered() ? fieldOf(target) : null;
      if (!field) return false;
      if (waitingClick) return true;
      const ready = freshlyHeld(editedFieldAddressOf(field));
      if (ready && editor) return begin(target, ready, caretAt(target, pointOf(event)), null);
      if (!ready) forget(editedFieldAddressOf(field));
      waitForState(target, field, event, openField);
      return true;
    },
    endIfRemoved() {
      if (editing && !(editing.twin.isConnected && editing.wrapper.isConnected)) commit();
      for (const wrapper of [...readOnlyTwins.keys()]) {
        if (!wrapper.isConnected) dropReadOnlyTwin(wrapper);
      }
    },
    isInsideRichText,
  };
}
