import type { VeDocument } from "../../shared/protocol.js";
import type { FieldMatch, FieldTracker } from "../overlay/fieldTracker.js";
import type { EditStatus } from "./editTransport.js";
import type { SaveStatus } from "./saveStatus.js";

import { fieldKeyOfMarker } from "../../shared/fieldKey.js";
import { veDocumentOf } from "../../shared/veDocument.js";
import { findAdminWindow } from "../adminWindow.js";
import { listenToSaves } from "../saveEvents.js";
import { createEditTransport } from "./editTransport.js";
import { createSaveStatus } from "./saveStatus.js";
import { createTextEditing } from "./textEditing.js";

export type InlineEditingCtx = {
  adminOrigin: string;
  payloadApi: string;
  locale?: string;
  inlineEditing: boolean;
};

export type HoldsValueOf = (document: VeDocument, key: string) => boolean;

export interface InlineEditing {
  editInPlace(target: HTMLElement, event: MouseEvent): boolean;
  sync(): void;
  dispose(): void;
}

const isPlainTextOfOneLocale = ({ holder, locale, richText }: FieldMatch): boolean =>
  holder !== undefined && richText === undefined && locale === undefined;

export function createInlineEditing(
  tracker: FieldTracker,
  getCtx: () => InlineEditingCtx,
  holdsValueOf: HoldsValueOf | null
): InlineEditing {
  const fields = new Map<Element, FieldMatch>();
  let shownStatus: EditStatus | null = null;
  let saveStatus: SaveStatus | null = null;

  const showStatus = (status: EditStatus) => {
    shownStatus = status;
    saveStatus?.show(status);
  };

  const transport = createEditTransport(getCtx, showStatus);
  saveStatus = createSaveStatus(document, transport.retry);

  const send = (match: FieldMatch, value: string) => {
    const key = fieldKeyOfMarker(match);
    const { locale } = getCtx();
    if (key === null) return;
    transport.send({ ...veDocumentOf(match), key, value, ...(locale !== undefined && { locale }) });
  };

  const textEditing = createTextEditing({ flush: transport.flush, send, tracker });

  const isWrittenSomewhere = (match: FieldMatch, key: string): boolean => {
    if (!findAdminWindow(window)) return true;
    return holdsValueOf?.(veDocumentOf(match), key) ?? false;
  };

  const stopTracking = tracker.subscribe({
    onFields: (_root, matches) => {
      for (const match of matches) {
        if (match.holder && isPlainTextOfOneLocale(match)) fields.set(match.holder, match);
      }
    },
    onNodesReleased: (matches) => {
      for (const match of matches) {
        if (match.holder && fields.get(match.holder) === match) fields.delete(match.holder);
      }
    },
  });

  const stopListeningToSaves = listenToSaves(
    () => getCtx().adminOrigin,
    () => {
      if (shownStatus === "unsaved") showStatus("saved");
    }
  );

  return {
    dispose() {
      textEditing.dispose();
      transport.dispose();
      stopListeningToSaves();
      stopTracking();
      saveStatus?.remove();
    },
    editInPlace(target, event) {
      if (!getCtx().inlineEditing) return false;
      if (textEditing.isEditing(target)) return true;
      const match = fields.get(target);
      const key = match && fieldKeyOfMarker(match);
      if (!match || !key || !isWrittenSomewhere(match, key)) return false;
      return textEditing.begin(match, { x: event.clientX, y: event.clientY });
    },
    sync() {
      if (!getCtx().inlineEditing) textEditing.commit();
    },
  };
}
