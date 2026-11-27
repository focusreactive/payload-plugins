import type { SaveRefusal } from "../../shared/fieldEdit.js";
import type { BadgeAction } from "../overlay/editBadge.js";
import type { VeEditedField } from "../../shared/protocol.js";
import type { FieldMatch, FieldTracker } from "../overlay/fieldTracker.js";
import type { ClickTaken } from "../overlay/editTargets.js";
import type { EditStatus } from "./editTransport.js";
import type { OpenForms } from "./pageFields.js";
import type { RichTextEditorLoader } from "./richTextEditor.js";
import type { SaveStatus } from "./saveStatus.js";
import type { BuildImageUrl } from "./shownImage.js";

import { payloadMediaApi } from "../../shared/mediaApi.js";
import { CLICK_LEFT_TO_THE_PAGE } from "../overlay/editTargets.js";
import { createAdminEditChannel } from "./adminEditChannel.js";
import { createEditRoutes } from "./editRoutes.js";
import { createEditTransport } from "./editTransport.js";
import { createImageReplacement } from "./imageReplacement.js";
import { createPageFields, isPageField } from "./pageFields.js";
import { createRichTextEditing } from "./richTextEditing.js";
import { createSaveStatus } from "./saveStatus.js";
import { offsetOfTheSameText, textNodesIn, textPositionAtPoint } from "./caret.js";
import { createTextEditing } from "./textEditing.js";

export type InlineEditingCtx = {
  adminOrigin: string;
  payloadApi: string;
  locale?: string;
  inlineEditing: boolean;
  onEdited?: () => void;
  richTextEditor?: RichTextEditorLoader;
  buildImageUrl?: BuildImageUrl;
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

  const routes = createEditRoutes({
    holdsAnyForm: () => openForms?.holdsAnyForm() ?? false,
    win: window,
  });

  const channel = createAdminEditChannel(window, () => getCtx().adminOrigin);

  const transport = createEditTransport(getCtx, showStatus, window, routes, channel);

  const pageFields = createPageFields({
    getLocale: () => getCtx().locale,
    isNextToAdmin: () => routes.currentAdmin() !== null,
    openForms,
  });

  const editedFieldOf = (match: FieldMatch): VeEditedField | null => {
    const answer = pageFields.fieldOf(match);
    return isPageField(answer) ? answer.field : null;
  };

  const isPlainTextOfThePage = (match: FieldMatch): boolean =>
    match.richText === undefined && editedFieldOf(match) !== null;

  const textEditing = createTextEditing({ beginEdit: transport.beginEdit, tracker });

  const richTextEditing = createRichTextEditing({
    beginEdit: transport.beginEdit,
    channel,
    currentAdmin: routes.currentAdmin,
    endOtherEdits: () => textEditing.commit(),
    getCtx,
    pageFields,
    tracker,
  });
  const mediaApiOfThePage = payloadMediaApi(() => getCtx().payloadApi);
  const imageReplacement = createImageReplacement({
    beginImageEdit: transport.beginImageEdit,
    getCtx,
    isInsideRichText: richTextEditing.isInsideRichText,
    mediaApiOf: (field) => {
      const adminWindow = routes.adminOf(field);
      return adminWindow ? channel.mediaApiOf(adminWindow) : mediaApiOfThePage;
    },
    pageFields,
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

  const saveBeforeThePageIsLeft = () => {
    richTextEditing.commitBeforeThePageIsHidden();
    transport.leavePage();
  };
  const saveBeforeThePageIsHidden = () => {
    if (document.visibilityState === HIDDEN) saveBeforeThePageIsLeft();
  };
  window.addEventListener(PAGE_LEFT_EVENT, saveBeforeThePageIsLeft);
  document.addEventListener(VISIBILITY_EVENT, saveBeforeThePageIsHidden);

  const endEdits = () => {
    textEditing.commit();
    richTextEditing.commit();
  };

  const editTextInPlace = (
    match: FieldMatch,
    field: VeEditedField,
    event: MouseEvent,
    caret?: number
  ): boolean => {
    richTextEditing.commit();
    return textEditing.begin(match, field, { x: event.clientX, y: event.clientY }, caret);
  };

  const textBeforeTheClick = (target: HTMLElement, event: MouseEvent): string | null => {
    const pieces = textNodesIn(target);
    const clicked = textPositionAtPoint(document, pieces, { x: event.clientX, y: event.clientY });
    return (
      clicked &&
      pieces
        .map(({ data }) => data)
        .join("")
        .slice(0, clicked.offset)
    );
  };

  const editSplitTextInPlace = (target: HTMLElement, event: MouseEvent): boolean | null => {
    const click: { textBefore?: string | null } = {};
    const joined = tracker.joinSplitText(target, (held) => {
      if (textFieldEditedHereOf(held) === null) return false;
      click.textBefore = textBeforeTheClick(target, event);
      return true;
    });
    const field = textFieldEditedHereOf(joined ?? undefined);
    if (!joined || !field) return null;
    const caret =
      typeof click.textBefore === "string"
        ? offsetOfTheSameText(click.textBefore, joined.textNode.data)
        : undefined;
    return editTextInPlace(joined, field, event, caret);
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
      channel.dispose();
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
      if (!match) {
        const editedSplitText = editSplitTextInPlace(target, event);
        if (editedSplitText !== null) return editedSplitText;
      }
      return richTextEditing.editInPlace(target, event, openField);
    },
    sync() {
      if (!getCtx().inlineEditing) endEdits();
    },
  };
}
