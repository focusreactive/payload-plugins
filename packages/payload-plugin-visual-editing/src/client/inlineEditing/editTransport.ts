import type { SaveRefusal } from "../../shared/fieldEdit.js";
import type {
  VeEdit,
  VeEditedField,
  VeEditorState,
  VeFieldEditMessage,
  VeLiveDocument,
  VeRichTextEditMessage,
} from "../../shared/protocol.js";

import {
  CHANGED_ELSEWHERE,
  isRichTextEdit,
  readSaveRefusal,
  SAVE_FAILED,
} from "../../shared/fieldEdit.js";
import { isPlainObject } from "../../shared/plainObject.js";
import {
  VE_FIELD_EDIT_PATH,
  VE_FIELD_EDIT_TYPE,
  VE_RICH_TEXT_EDIT_TYPE,
} from "../../shared/protocol.js";
import { readPostedEditorState } from "../../shared/richText/postedEditorState.js";
import { isSameValue } from "../../shared/sameValue.js";
import { documentAddressOf, keyedFieldAddressOf } from "../../shared/veDocument.js";
import type { FindAdminWindow } from "../adminWindow.js";

import { adminOriginOf, findAdminWindow } from "../adminWindow.js";

export type EditStatus = "failed" | "saved" | "saving" | "unsaved";

export type EditTransportCtx = { adminOrigin: string; payloadApi: string; onEdited?: () => void };

export type EditedField = VeEditedField;

export type OnSaveEnded = (isSaved: boolean) => void;

export type OnStatus = (status: EditStatus, refusal?: SaveRefusal) => void;

export type OnDelivered = () => void;

export interface EditTransport {
  send(edit: VeEdit, onDelivered?: OnDelivered): void;
  hold(edit: VeEdit): void;
  drop(field: EditedField): void;
  sendNow(edit: VeEdit, onSaveEnded?: OnSaveEnded): void;
  holdInForm(field: EditedField): void;
  isUnsaved(field: EditedField): boolean;
  flush(): void;
  flushBeforeLeaving(): void;
  refuse(field: EditedField): void;
  settle(saved: VeLiveDocument | null): void;
  retry(): void;
  dispose(): void;
}

export const EDIT_SEND_PAUSE_MS = 400;

export const EDIT_SAVE_PAUSE_MS = 2000;

type WaitingEdit = {
  edit: VeEdit;
  timer: ReturnType<typeof setTimeout> | null;
  onDelivered?: OnDelivered;
};

type FailedEdit = { edit: VeEdit; refusal: SaveRefusal };

type EditValue = string | VeEditorState;

type SavedEdit = { startedFrom: EditValue; sent: EditValue; stored: EditValue };

type EndpointAnswer = { refusal: SaveRefusal | null; stored: unknown };

type PostedAnswer = { refusal: SaveRefusal | null; isLatest: boolean };

type PageLeave = { left: Promise<void>; leave: () => void };

const nextPageLeave = (): PageLeave => {
  let leave: PageLeave["leave"] | undefined;
  const left = new Promise<void>((resolve) => {
    leave = resolve;
  });
  return { leave: () => leave?.(), left };
};

const addressOf = (field: EditedField): string =>
  JSON.stringify([keyedFieldAddressOf(field), field.locale ?? null]);

const isSavedWith = (edit: EditedField, saved: VeLiveDocument): boolean =>
  documentAddressOf(edit) === documentAddressOf(saved) &&
  (!edit.locale || !saved.locale || edit.locale === saved.locale);

export const KEEPALIVE_BODY_LIMIT = 60_000;

const bytesOf = (body: string): number => new TextEncoder().encode(body).length;

const messageOf = ({
  base: _base,
  sentBefore: _sentBefore,
  ...edit
}: VeEdit): VeFieldEditMessage | VeRichTextEditMessage =>
  "state" in edit
    ? { ...edit, type: VE_RICH_TEXT_EDIT_TYPE }
    : { ...edit, type: VE_FIELD_EDIT_TYPE };

const valueOf = (edit: VeEdit): EditValue => (isRichTextEdit(edit) ? edit.state : edit.value);

const storedValueOf = (edit: VeEdit, stored: unknown): EditValue => {
  if (isRichTextEdit(edit)) return readPostedEditorState(stored) ?? edit.state;
  return typeof stored === "string" ? stored : edit.value;
};

type StartingValue = "base" | "sentBefore";

const withStartingValue = (edit: VeEdit, name: StartingValue, value: EditValue): VeEdit => {
  if (isRichTextEdit(edit)) return typeof value === "string" ? edit : { ...edit, [name]: value };
  return typeof value === "string" ? { ...edit, [name]: value } : edit;
};

const continuesSaved = (edit: VeEdit, saved: SavedEdit | undefined): saved is SavedEdit =>
  saved !== undefined &&
  edit.base !== undefined &&
  (isSameValue(edit.base, saved.startedFrom) || isSameValue(edit.base, saved.sent));

const isSavedBy = (response: Response, answer: unknown): boolean =>
  response.ok && isPlainObject(answer) && answer.saved === true;

const postToEndpoint = async (win: Window, url: string, edit: VeEdit): Promise<EndpointAnswer> => {
  try {
    const body = JSON.stringify(edit);
    const response = await win.fetch(url, {
      body,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      keepalive: bytesOf(body) <= KEEPALIVE_BODY_LIMIT,
      method: "POST",
    });
    const answer: unknown = await response.json();
    return isSavedBy(response, answer)
      ? { refusal: null, stored: isPlainObject(answer) ? answer.value : undefined }
      : { refusal: readSaveRefusal(answer), stored: undefined };
  } catch {
    return { refusal: SAVE_FAILED, stored: undefined };
  }
};

export function createEditTransport(
  getCtx: () => EditTransportCtx,
  onStatus: OnStatus,
  win: Window = window,
  findAdmin: FindAdminWindow = () => findAdminWindow(win)
): EditTransport {
  const waiting = new Map<string, WaitingEdit>();
  const failed = new Map<string, FailedEdit>();
  const postedToAdmin = new Map<string, VeEdit>();
  const unsavedInForm = new Map<string, EditedField>();
  const watchedSaves = new Map<string, OnSaveEnded>();
  const savesOnTheWay = new Map<string, number>();
  const savedEdits = new Map<string, SavedEdit>();
  const latestPosted = new Map<string, VeEdit>();
  const latestQueued = new Map<string, VeEdit>();
  let saves: Promise<void> = Promise.resolve();
  let pageLeave = nextPageLeave();
  let isDisposed = false;

  const latestRefusal = (): SaveRefusal | undefined => [...failed.values()].at(-1)?.refusal;

  const report = (status: EditStatus) => {
    if (isDisposed) return;
    const refusal = latestRefusal();
    if (refusal === undefined) onStatus(status);
    else onStatus("failed", refusal);
  };

  const settle = () => report("saved");

  const statusAfterASave = (): EditStatus => {
    if (waiting.size > 0 || unsavedInForm.size > 0) return "unsaved";
    if (savesOnTheWay.size > 0) return "saving";
    return "saved";
  };

  const fail = (edit: VeEdit, refusal: SaveRefusal) => {
    failed.delete(addressOf(edit));
    failed.set(addressOf(edit), { edit, refusal });
  };

  const countSaveOnTheWay = (address: string, change: number) => {
    const onTheWay = (savesOnTheWay.get(address) ?? 0) + change;
    if (onTheWay > 0) savesOnTheWay.set(address, onTheWay);
    else savesOnTheWay.delete(address);
  };

  const isChangedElsewhere = (address: string): boolean =>
    failed.get(address)?.refusal === CHANGED_ELSEWHERE;

  const rememberSaved = (edit: VeEdit, continued: SavedEdit | null, stored: unknown) => {
    if (edit.base === undefined) return;
    savedEdits.set(addressOf(edit), {
      sent: valueOf(edit),
      startedFrom: continued?.startedFrom ?? edit.base,
      stored: storedValueOf(edit, stored),
    });
  };

  const startingValuesOf = (edit: VeEdit, continued: SavedEdit | null): VeEdit => {
    const rebased = continued ? withStartingValue(edit, "base", continued.stored) : edit;
    const earlier = latestPosted.get(addressOf(edit));
    return earlier && edit.base !== undefined
      ? withStartingValue(rebased, "sentBefore", valueOf(earlier))
      : rebased;
  };

  const post = async (edit: VeEdit): Promise<PostedAnswer> => {
    const address = addressOf(edit);
    if (isChangedElsewhere(address)) return { isLatest: true, refusal: CHANGED_ELSEWHERE };
    const saved = savedEdits.get(address);
    const continued = continuesSaved(edit, saved) ? saved : null;
    const posted = startingValuesOf(edit, continued);
    latestPosted.set(address, edit);
    const { refusal, stored } = await postToEndpoint(
      win,
      `${getCtx().payloadApi}${VE_FIELD_EDIT_PATH}`,
      posted
    );
    const isLatest = latestPosted.get(address) === edit;
    if (isLatest) latestPosted.delete(address);
    if (isLatest && refusal === null) rememberSaved(edit, continued, stored);
    return { isLatest, refusal };
  };

  const saveThroughEndpoint = async (edit: VeEdit) => {
    report("saving");
    countSaveOnTheWay(addressOf(edit), 1);
    const { isLatest, refusal } = await post(edit);
    const isSaved = refusal === null;
    countSaveOnTheWay(addressOf(edit), -1);
    if (isLatest && isSaved) failed.delete(addressOf(edit));
    else if (isLatest && refusal) fail(edit, refusal);
    report(statusAfterASave());
    if (isDisposed || !isLatest) return;
    watchedSaves.get(addressOf(edit))?.(isSaved);
    if (isSaved) getCtx().onEdited?.();
  };

  const saveAfter = async (earlierSaves: Promise<void>, edit: VeEdit) => {
    const address = addressOf(edit);
    latestQueued.set(address, edit);
    countSaveOnTheWay(address, 1);
    await Promise.race([earlierSaves, pageLeave.left]);
    countSaveOnTheWay(address, -1);
    if (latestQueued.get(address) !== edit) return;
    latestQueued.delete(address);
    await saveThroughEndpoint(edit);
  };

  const deliver = (edit: VeEdit) => {
    const adminWindow = findAdmin();
    if (!adminWindow) {
      saves = saveAfter(saves, edit);
      return;
    }
    failed.delete(addressOf(edit));
    postedToAdmin.set(addressOf(edit), edit);
    unsavedInForm.set(addressOf(edit), edit);
    adminWindow.postMessage(messageOf(edit), adminOriginOf(getCtx().adminOrigin));
  };

  const stopWaiting = (address: string): WaitingEdit | null => {
    const held = waiting.get(address) ?? null;
    if (held?.timer) clearTimeout(held.timer);
    waiting.delete(address);
    return held;
  };

  const isIdle = (): boolean =>
    waiting.size === 0 && savesOnTheWay.size === 0 && unsavedInForm.size === 0;

  const deliverWaiting = (address: string) => {
    const held = stopWaiting(address);
    if (!held) return;
    held.onDelivered?.();
    deliver(held.edit);
  };

  const supersede = (address: string) => {
    stopWaiting(address);
    if (!isChangedElsewhere(address)) failed.delete(address);
  };

  const flush = () => {
    for (const address of [...waiting.keys()]) deliverWaiting(address);
  };

  return {
    dispose() {
      flush();
      isDisposed = true;
    },
    drop(field) {
      if (stopWaiting(addressOf(field)) && isIdle()) settle();
    },
    hold(edit) {
      const address = addressOf(edit);
      supersede(address);
      watchedSaves.delete(address);
      waiting.set(address, { edit, timer: null });
      report("unsaved");
    },
    flush,
    flushBeforeLeaving() {
      flush();
      pageLeave.leave();
      pageLeave = nextPageLeave();
    },
    refuse(field) {
      const edit = postedToAdmin.get(addressOf(field));
      if (!edit) return;
      fail(edit, SAVE_FAILED);
      report("failed");
    },
    retry() {
      const edits = [...failed.values()];
      failed.clear();
      for (const { edit } of edits) deliver(edit);
      if (unsavedInForm.size > 0) report("unsaved");
    },
    send(edit, onDelivered) {
      const address = addressOf(edit);
      supersede(address);
      watchedSaves.delete(address);
      const pause = findAdmin() ? EDIT_SEND_PAUSE_MS : EDIT_SAVE_PAUSE_MS;
      const timer = setTimeout(deliverWaiting, pause, address);
      waiting.set(address, { edit, onDelivered, timer });
      report("unsaved");
    },
    sendNow(edit, onSaveEnded) {
      const address = addressOf(edit);
      supersede(address);
      if (onSaveEnded) watchedSaves.set(address, onSaveEnded);
      else watchedSaves.delete(address);
      report("unsaved");
      deliver(edit);
    },
    isUnsaved(field) {
      const address = addressOf(field);
      return waiting.has(address) || savesOnTheWay.has(address) || failed.has(address);
    },
    holdInForm(field) {
      unsavedInForm.set(addressOf(field), field);
      report("unsaved");
    },
    settle(saved) {
      if (unsavedInForm.size === 0) return;
      for (const [address, field] of unsavedInForm) {
        if (saved && !isSavedWith(field, saved)) continue;
        unsavedInForm.delete(address);
        postedToAdmin.delete(address);
      }
      if (unsavedInForm.size === 0) report(statusAfterASave());
    },
  };
}
