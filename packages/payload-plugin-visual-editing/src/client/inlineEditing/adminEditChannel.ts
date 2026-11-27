import type { SaveRefusal } from "../../shared/fieldEdit.js";
import type { PlainObject } from "../../shared/plainObject.js";
import type {
  VeEditedField,
  VeEditorState,
  VeFieldEditMessage,
  VePickMediaMessage,
  VeRichTextEditEndedMessage,
  VeRichTextEditMessage,
  VeRichTextStateRequestMessage,
  VePickedMedia,
} from "../../shared/protocol.js";
import type { VeRichTextFormats } from "../../shared/richText/formats.js";
import type { SavedDocument } from "../saveEvents.js";

import { readEditedField, readRichTextEdit, readSaveRefusal } from "../../shared/fieldEdit.js";
import { pickedMediaOf } from "../../shared/mediaOption.js";
import {
  VE_DOCUMENT_SAVED_TYPE,
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_FIELD_PATCH_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_MEDIA_PICK_CANCELLED_TYPE,
  VE_MEDIA_PICKED_TYPE,
  VE_RICH_TEXT_STATE_REFUSED_TYPE,
  VE_RICH_TEXT_STATE_TYPE,
  VE_RICH_TEXT_STRUCTURE_TYPE,
} from "../../shared/protocol.js";
import { readFormats } from "../../shared/richText/formats.js";
import { editedFieldAddressOf } from "../../shared/veDocument.js";
import { adminOriginOf, hearTheAdmin } from "../adminWindow.js";
import { savedDocumentOf } from "../saveEvents.js";

export const MEDIA_PICK_TIME_LIMIT_MS = 60_000;

export const RICH_TEXT_STATE_TIME_LIMIT_MS = 4000;

export type VeToldOfAnEdit =
  | VeFieldEditMessage
  | VeRichTextEditMessage
  | VeRichTextEditEndedMessage;

export type AnsweredRichText = { state: VeEditorState; formats: VeRichTextFormats };

export type AdminAnswers<Answer> = {
  answered(answer: Answer): void;
  refused(refusal: SaveRefusal): void;
  cancelled?(): void;
};

export interface AdminRequests<Request extends VeEditedField, Answer> {
  ask(adminWindow: Window, request: Request, answers: AdminAnswers<Answer>): void;
  isAsked(field: VeEditedField, adminWindow?: Window): boolean;
  forget(field: VeEditedField): void;
}

export type DocumentNews = { document: SavedDocument; isSave: boolean };

export interface AdminEditChannel {
  mediaPicks: AdminRequests<VePickMediaMessage, VePickedMedia>;
  richTextStates: AdminRequests<VeRichTextStateRequestMessage, AnsweredRichText>;
  tell(adminWindow: Window, message: VeToldOfAnEdit): void;
  onRefusedEdit(listener: (field: VeEditedField, refusal: SaveRefusal) => void): () => void;
  onDocumentNews(listener: (news: DocumentNews) => void): () => void;
  dispose(): void;
}

type Answering<Answer> = {
  timeLimitMs: number;
  takesLateAnswers: boolean;
  answerType: string;
  refusalType: string;
  cancelType?: string;
  read(message: PlainObject): Answer | null;
};

type Asked<Answer> = { adminWindow: Window; askedAt: number; answers: AdminAnswers<Answer> };

type Requests<Request extends VeEditedField, Answer> = AdminRequests<Request, Answer> & {
  hear(message: PlainObject): void;
};

const NEWS_OF_A_DOCUMENT: ReadonlySet<unknown> = new Set([
  VE_RICH_TEXT_STRUCTURE_TYPE,
  VE_FIELD_PATCH_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_DOCUMENT_SAVED_TYPE,
]);

const MEDIA_PICK: Answering<VePickedMedia> = {
  answerType: VE_MEDIA_PICKED_TYPE,
  cancelType: VE_MEDIA_PICK_CANCELLED_TYPE,
  read: pickedMediaOf,
  refusalType: VE_FIELD_EDIT_REFUSED_TYPE,
  takesLateAnswers: true,
  timeLimitMs: MEDIA_PICK_TIME_LIMIT_MS,
};

const readAnsweredRichText = (message: PlainObject): AnsweredRichText | null => {
  const edit = readRichTextEdit(message);
  const formats = readFormats(message.formats);
  return edit && formats ? { formats, state: edit.state } : null;
};

const RICH_TEXT_STATE: Answering<AnsweredRichText> = {
  answerType: VE_RICH_TEXT_STATE_TYPE,
  read: readAnsweredRichText,
  refusalType: VE_RICH_TEXT_STATE_REFUSED_TYPE,
  takesLateAnswers: false,
  timeLimitMs: RICH_TEXT_STATE_TIME_LIMIT_MS,
};

const listen = <Listener>(listeners: Set<Listener>, listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

function createRequests<Request extends VeEditedField, Answer>(
  answering: Answering<Answer>,
  post: (adminWindow: Window, message: Request) => void
): Requests<Request, Answer> {
  const asked = new Map<string, Asked<Answer>>();

  const isStillAsked = (address: string, adminWindow?: Window): boolean => {
    const open = asked.get(address);
    return (
      open !== undefined &&
      (adminWindow === undefined || open.adminWindow === adminWindow) &&
      !open.adminWindow.closed &&
      Date.now() - open.askedAt < answering.timeLimitMs
    );
  };

  const take = (message: PlainObject): AdminAnswers<Answer> | null => {
    const field = readEditedField(message);
    const address = field && editedFieldAddressOf(field);
    const open = address && asked.get(address);
    if (!address || !open) return null;
    const isInTime = answering.takesLateAnswers || isStillAsked(address);
    asked.delete(address);
    return isInTime ? open.answers : null;
  };

  return {
    ask(adminWindow, request, answers) {
      const address = editedFieldAddressOf(request);
      if (isStillAsked(address, adminWindow)) return;
      asked.set(address, { adminWindow, answers, askedAt: Date.now() });
      post(adminWindow, request);
    },
    forget(field) {
      asked.delete(editedFieldAddressOf(field));
    },
    hear(message) {
      if (message.type === answering.answerType) {
        const answer = answering.read(message);
        const answers = take(message);
        if (answer === null) answers?.refused(readSaveRefusal(message));
        else answers?.answered(answer);
      } else if (message.type === answering.refusalType) {
        take(message)?.refused(readSaveRefusal(message));
      } else if (answering.cancelType && message.type === answering.cancelType) {
        take(message)?.cancelled?.();
      }
    },
    isAsked: (field, adminWindow) => isStillAsked(editedFieldAddressOf(field), adminWindow),
  };
}

export function createAdminEditChannel(win: Window, adminOrigin: () => string): AdminEditChannel {
  const refusedEditListeners = new Set<(field: VeEditedField, refusal: SaveRefusal) => void>();
  const newsListeners = new Set<(news: DocumentNews) => void>();

  const tell = (adminWindow: Window, message: unknown) => {
    adminWindow.postMessage(message, adminOriginOf(adminOrigin(), win));
  };

  const mediaPicks = createRequests<VePickMediaMessage, VePickedMedia>(MEDIA_PICK, tell);
  const richTextStates = createRequests<VeRichTextStateRequestMessage, AnsweredRichText>(
    RICH_TEXT_STATE,
    tell
  );

  const hearRefusedEdit = (message: PlainObject) => {
    const refused = readEditedField(message);
    if (!refused) return;
    for (const listener of refusedEditListeners) listener(refused, readSaveRefusal(message));
  };

  const stopHearing = hearTheAdmin(win, adminOrigin, (message) => {
    mediaPicks.hear(message);
    richTextStates.hear(message);
    if (message.type === VE_FIELD_EDIT_REFUSED_TYPE) hearRefusedEdit(message);
    if (!NEWS_OF_A_DOCUMENT.has(message.type)) return;
    const news = {
      document: savedDocumentOf(message),
      isSave: message.type === VE_DOCUMENT_SAVED_TYPE,
    };
    for (const listener of newsListeners) listener(news);
  });

  return {
    dispose() {
      stopHearing();
      refusedEditListeners.clear();
      newsListeners.clear();
    },
    mediaPicks,
    onDocumentNews: (listener) => listen(newsListeners, listener),
    onRefusedEdit: (listener) => listen(refusedEditListeners, listener),
    richTextStates,
    tell,
  };
}
