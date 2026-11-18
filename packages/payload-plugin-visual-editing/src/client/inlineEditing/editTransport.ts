import type { SaveRefusal } from "../../shared/fieldEdit.js";
import type {
  VeEdit,
  VeEditedField,
  VeFieldEditMessage,
  VeLiveDocument,
  VeRichTextEditMessage,
} from "../../shared/protocol.js";

import { isRichTextEdit, readSaveRefusal, SAVE_FAILED } from "../../shared/fieldEdit.js";
import { isPlainObject } from "../../shared/plainObject.js";
import {
  VE_FIELD_EDIT_PATH,
  VE_FIELD_EDIT_TYPE,
  VE_RICH_TEXT_EDIT_TYPE,
} from "../../shared/protocol.js";
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

const messageOf = (edit: VeEdit): VeFieldEditMessage | VeRichTextEditMessage =>
  isRichTextEdit(edit)
    ? { ...edit, type: VE_RICH_TEXT_EDIT_TYPE }
    : { ...edit, type: VE_FIELD_EDIT_TYPE };

const isSavedBy = (response: Response, answer: unknown): boolean =>
  response.ok && isPlainObject(answer) && answer.saved === true;

const postToEndpoint = async (
  win: Window,
  url: string,
  edit: VeEdit
): Promise<SaveRefusal | null> => {
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
    return isSavedBy(response, answer) ? null : readSaveRefusal(answer);
  } catch {
    return SAVE_FAILED;
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

  const saveThroughEndpoint = async (edit: VeEdit) => {
    report("saving");
    countSaveOnTheWay(addressOf(edit), 1);
    const refusal = await postToEndpoint(win, `${getCtx().payloadApi}${VE_FIELD_EDIT_PATH}`, edit);
    const isSaved = refusal === null;
    countSaveOnTheWay(addressOf(edit), -1);
    if (isSaved) failed.delete(addressOf(edit));
    else fail(edit, refusal);
    report(statusAfterASave());
    if (isDisposed) return;
    watchedSaves.get(addressOf(edit))?.(isSaved);
    if (isSaved) getCtx().onEdited?.();
  };

  const saveAfter = async (earlierSaves: Promise<void>, edit: VeEdit) => {
    countSaveOnTheWay(addressOf(edit), 1);
    await Promise.race([earlierSaves, pageLeave.left]);
    countSaveOnTheWay(addressOf(edit), -1);
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
    failed.delete(address);
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
