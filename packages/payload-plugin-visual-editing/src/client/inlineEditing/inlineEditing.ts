import type { SaveRefusal } from "../../shared/fieldEdit.js";
import type { VeDocument } from "../../shared/protocol.js";
import type { BadgeAction } from "../overlay/editBadge.js";
import type { FieldMatch, FieldTracker } from "../overlay/fieldTracker.js";
import type { ClickTaken } from "../overlay/targetRegistry.js";
import type { EditStatus, OnDelivered } from "./editTransport.js";
import type { RichTextEditorLoader } from "./richTextEditor.js";
import type { SaveStatus } from "./saveStatus.js";

import { fieldKeyOfMarker } from "../../shared/fieldKey.js";
import { readEditedField } from "../../shared/fieldEdit.js";
import { isMessageFrom } from "../../shared/messageSource.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { VE_FIELD_EDIT_REFUSED_TYPE } from "../../shared/protocol.js";
import { veDocumentOf } from "../../shared/veDocument.js";
import { adminOriginOf, findAdminWindow, isFramedByAdmin } from "../adminWindow.js";
import { listenToSaves } from "../saveEvents.js";
import { CLICK_LEFT_TO_THE_PAGE } from "../overlay/targetRegistry.js";
import { createEditTransport } from "./editTransport.js";
import { createImageReplacement } from "./imageReplacement.js";
import { createRichTextEditing } from "./richTextEditing.js";
import { createSaveStatus } from "./saveStatus.js";
import { createTextEditing } from "./textEditing.js";

export type InlineEditingCtx = {
  adminOrigin: string;
  payloadApi: string;
  locale?: string;
  inlineEditing: boolean;
  onEdited?: () => void;
  richTextEditor?: RichTextEditorLoader;
};

export type OpenForms = {
  holdsValueOf(document: VeDocument, key: string): boolean;
  holdsFormOf(document: VeDocument): boolean;
  holdsAnyForm(): boolean;
};

const PAGE_LEFT_EVENT = "pagehide";
const VISIBILITY_EVENT = "visibilitychange";
const HIDDEN = "hidden";

export interface InlineEditing {
  editInPlace(target: HTMLElement, event: MouseEvent, openField: () => void): ClickTaken;
  actionOf(target: HTMLElement): BadgeAction | null;
  sync(): void;
  dispose(): void;
}

const CONTROL = "a, button";

const isBesideTheTextOfAControl = ({ textNode }: FieldMatch, event: MouseEvent): boolean => {
  const textElement = textNode.parentElement;
  const control = textElement?.closest(CONTROL);
  if (!textElement || !control || control === textElement) return false;
  return !(event.target instanceof Node && textElement.contains(event.target));
};

const isPlainTextOfOneLocale = ({ holder, locale, richText }: FieldMatch): boolean =>
  holder !== undefined && richText === undefined && locale === undefined;

export function createInlineEditing(
  tracker: FieldTracker,
  getCtx: () => InlineEditingCtx,
  openForms: OpenForms | null
): InlineEditing {
  const fields = new Map<Element, FieldMatch>();
  let saveStatus: SaveStatus | null = null;

  const showStatus = (status: EditStatus, refusal?: SaveRefusal) => {
    saveStatus?.show(status, refusal);
  };

  const findAdmin = (): Window | null => {
    const adminWindow = findAdminWindow(window);
    if (!adminWindow) return null;
    const isTold = isFramedByAdmin(window) || (openForms?.holdsAnyForm() ?? false);
    return isTold ? adminWindow : null;
  };

  const transport = createEditTransport(getCtx, showStatus, window, findAdmin);
  const holdsFormOf = openForms && ((document: VeDocument) => openForms.holdsFormOf(document));

  const editedFieldOf = (match: FieldMatch) => {
    const key = fieldKeyOfMarker(match);
    const { locale } = getCtx();
    return key === null
      ? null
      : { ...veDocumentOf(match), key, ...(locale !== undefined && { locale }) };
  };

  const send = (
    match: FieldMatch,
    value: string,
    startedFrom: string,
    onDelivered?: OnDelivered
  ) => {
    const field = editedFieldOf(match);
    if (field) transport.send({ ...field, base: startedFrom, value }, onDelivered);
  };

  const dropWaiting = (match: FieldMatch) => {
    const field = editedFieldOf(match);
    if (field) transport.drop(field);
  };

  const textEditing = createTextEditing({ dropWaiting, flush: transport.flush, send, tracker });

  const richTextEditing = createRichTextEditing({
    dropUnsaved: transport.drop,
    endOtherEdits: () => textEditing.commit(),
    findAdmin,
    flush: transport.flush,
    getCtx,
    holdUnsaved: transport.hold,
    holdsFormOf,
    isUnsaved: transport.isUnsaved,
    send: transport.send,
    tracker,
  });
  const imageReplacement = createImageReplacement({
    findAdmin,
    getCtx,
    holdsFormOf,
    isInsideRichText: richTextEditing.isInsideRichText,
    holdInForm: transport.holdInForm,
    save: transport.sendNow,
    showStatus,
    tracker,
  });
  saveStatus = createSaveStatus(document, transport.retry);

  const isWrittenSomewhere = (match: FieldMatch, key: string): boolean => {
    if (!findAdmin()) return true;
    return openForms?.holdsValueOf(veDocumentOf(match), key) ?? false;
  };

  const stopTracking = tracker.subscribe({
    onFields: (_root, matches) => {
      for (const match of matches) {
        if (match.holder && isPlainTextOfOneLocale(match)) fields.set(match.holder, match);
      }
    },
    onContentRemoved: () => {
      textEditing.endIfRemoved();
      richTextEditing.endIfRemoved();
    },
    onNodesReleased: (matches) => {
      for (const match of matches) {
        if (match.holder && fields.get(match.holder) === match) fields.delete(match.holder);
      }
    },
  });

  const refuseEditTheFormDidNotTake = (event: MessageEvent) => {
    const { adminOrigin } = getCtx();
    if (!isMessageFrom(event, adminOriginOf(adminOrigin), findAdminWindow(window))) return;
    const { data } = event;
    if (!isPlainObject(data) || data.type !== VE_FIELD_EDIT_REFUSED_TYPE) return;
    const refused = readEditedField(data);
    if (refused) transport.refuse(refused);
  };
  window.addEventListener("message", refuseEditTheFormDidNotTake);

  const saveBeforeThePageIsLeft = () => {
    richTextEditing.commitBeforeThePageIsHidden();
    transport.flushBeforeLeaving();
  };
  const saveBeforeThePageIsHidden = () => {
    if (document.visibilityState === HIDDEN) saveBeforeThePageIsLeft();
  };
  window.addEventListener(PAGE_LEFT_EVENT, saveBeforeThePageIsLeft);
  document.addEventListener(VISIBILITY_EVENT, saveBeforeThePageIsHidden);

  const stopListeningToSaves = listenToSaves(
    () => getCtx().adminOrigin,
    (saved) => transport.settle(saved)
  );

  const endEdits = () => {
    textEditing.commit();
    richTextEditing.commit();
  };

  const editTextInPlace = (match: FieldMatch, event: MouseEvent): boolean => {
    richTextEditing.commit();
    return textEditing.begin(match, { x: event.clientX, y: event.clientY });
  };

  return {
    actionOf(target) {
      const action = imageReplacement.actionOf(target);
      return (
        action && {
          label: action.label,
          run: (openField) => {
            endEdits();
            action.run(openField);
          },
        }
      );
    },
    dispose() {
      imageReplacement.dispose();
      richTextEditing.dispose();
      textEditing.dispose();
      transport.dispose();
      stopListeningToSaves();
      window.removeEventListener("message", refuseEditTheFormDidNotTake);
      window.removeEventListener(PAGE_LEFT_EVENT, saveBeforeThePageIsLeft);
      document.removeEventListener(VISIBILITY_EVENT, saveBeforeThePageIsHidden);
      stopTracking();
      saveStatus?.remove();
    },
    editInPlace(target, event, openField) {
      if (!getCtx().inlineEditing) return false;
      const match = fields.get(target);
      const key = match && fieldKeyOfMarker(match);
      const isEditedHere = match && key && isWrittenSomewhere(match, key);
      if (isEditedHere && isBesideTheTextOfAControl(match, event)) return CLICK_LEFT_TO_THE_PAGE;
      if (textEditing.isEditing(target)) return true;
      if (isEditedHere) return editTextInPlace(match, event);
      return richTextEditing.editInPlace(target, event, openField);
    },
    sync() {
      if (!getCtx().inlineEditing) endEdits();
    },
  };
}
