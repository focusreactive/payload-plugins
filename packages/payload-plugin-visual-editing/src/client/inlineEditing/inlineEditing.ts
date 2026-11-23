import type { SaveRefusal } from "../../shared/fieldEdit.js";
import type { BadgeAction } from "../overlay/editBadge.js";
import type { VeEditedField } from "../../shared/protocol.js";
import type { FieldMatch, FieldTracker } from "../overlay/fieldTracker.js";
import type { ClickTaken } from "../overlay/editTargets.js";
import type { EditStatus, OnDelivered } from "./editTransport.js";
import type { OpenForms } from "./pageFields.js";
import type { RichTextEditorLoader } from "./richTextEditor.js";
import type { SaveStatus } from "./saveStatus.js";

import { readEditedField, readSaveRefusal } from "../../shared/fieldEdit.js";
import { isMessageFrom } from "../../shared/messageSource.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { VE_FIELD_EDIT_REFUSED_TYPE } from "../../shared/protocol.js";
import { editedFieldAddressOf } from "../../shared/veDocument.js";
import { adminOriginOf, findAdminWindow, isFramedByAdmin } from "../adminWindow.js";
import { listenToSaves } from "../saveEvents.js";
import { CLICK_LEFT_TO_THE_PAGE } from "../overlay/editTargets.js";
import { createEditTransport } from "./editTransport.js";
import { createImageReplacement } from "./imageReplacement.js";
import { createPageFields, isPageField } from "./pageFields.js";
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

  const pinnedAdmins = new Map<string, { field: VeEditedField; admin: Window | null }>();

  const adminOf = (field: VeEditedField): Window | null => {
    const pinned = pinnedAdmins.get(editedFieldAddressOf(field));
    if (!pinned) return findAdmin();
    return pinned.admin && pinned.admin === findAdmin() ? pinned.admin : null;
  };

  const transport = createEditTransport(getCtx, showStatus, window, adminOf);

  const pinAdmin = (field: VeEditedField) => {
    for (const [address, pinned] of pinnedAdmins) {
      if (!transport.isUnsaved(pinned.field)) pinnedAdmins.delete(address);
    }
    pinnedAdmins.set(editedFieldAddressOf(field), { admin: findAdmin(), field });
  };
  const pageFields = createPageFields({
    getLocale: () => getCtx().locale,
    isNextToAdmin: () => findAdmin() !== null,
    openForms,
  });

  const editedFieldOf = (match: FieldMatch): VeEditedField | null => {
    const answer = pageFields.fieldOf(match);
    return isPageField(answer) ? answer.field : null;
  };

  const isPlainTextOfThePage = (match: FieldMatch): boolean =>
    match.richText === undefined && editedFieldOf(match) !== null;

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
    adminOf,
    dropUnsaved: transport.drop,
    endOtherEdits: () => textEditing.commit(),
    findAdmin,
    flush: transport.flush,
    getCtx,
    holdUnsaved: transport.hold,
    isUnsaved: transport.isUnsaved,
    pageFields,
    pinAdmin,
    send: transport.send,
    tracker,
  });
  const imageReplacement = createImageReplacement({
    findAdmin,
    getCtx,
    isInsideRichText: richTextEditing.isInsideRichText,
    holdInForm: transport.holdInForm,
    pageFields,
    refuseAsked: transport.refuseAsked,
    save: transport.sendNow,
    tracker,
  });
  saveStatus = createSaveStatus(document, transport.retry);

  const textFieldEditedHereOf = (match: FieldMatch | undefined): VeEditedField | null => {
    const answer = match && pageFields.editableFieldOf(match, "text");
    return answer && isPageField(answer) ? answer.field : null;
  };

  const stopTracking = tracker.subscribe({
    onFields: (_root, matches) => {
      for (const match of matches) {
        if (match.holder && isPlainTextOfThePage(match)) fields.set(match.holder, match);
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
    if (refused) transport.refuse(refused, readSaveRefusal(data));
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

  const editTextInPlace = (match: FieldMatch, field: VeEditedField, event: MouseEvent): boolean => {
    richTextEditing.commit();
    pinAdmin(field);
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
      const field = textFieldEditedHereOf(match);
      if (match && field && isBesideTheTextOfAControl(match, event)) return CLICK_LEFT_TO_THE_PAGE;
      if (textEditing.isEditing(target)) return true;
      if (match && field) return editTextInPlace(match, field, event);
      return richTextEditing.editInPlace(target, event, openField);
    },
    sync() {
      if (!getCtx().inlineEditing) endEdits();
    },
  };
}
