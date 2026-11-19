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
import { documentAddressOf, editedFieldAddressOf } from "../../shared/veDocument.js";

import { adminOriginOf, findAdminWindow } from "../adminWindow.js";

export type EditStatus = "failed" | "saved" | "saving" | "unsaved";

export type EditTransportCtx = { adminOrigin: string; payloadApi: string; onEdited?: () => void };

export type EditedField = VeEditedField;

export type OnSaveEnded = (isSaved: boolean) => void;

export type OnStatus = (status: EditStatus, refusal?: SaveRefusal) => void;

export type OnDelivered = () => void;

export type RetryRefused = () => void;

export type FindAdminOf = (field: EditedField) => Window | null;

export interface EditTransport {
  send(edit: VeEdit, onDelivered?: OnDelivered): void;
  hold(edit: VeEdit): void;
  drop(field: EditedField): void;
  sendNow(edit: VeEdit, onSaveEnded?: OnSaveEnded): void;
  holdInForm(field: EditedField): void;
  isUnsaved(field: EditedField): boolean;
  flush(): void;
  flushBeforeLeaving(): void;
  refuse(field: EditedField, refusal?: SaveRefusal): void;
  refuseAsked(field: EditedField, refusal: SaveRefusal, askAgain: RetryRefused): void;
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

type FailedEdit = { refusal: SaveRefusal } & ({ edit: VeEdit } | { askAgain: RetryRefused });

type EditValue = string | VeEditorState;

type SavedEdit = { startedFrom: EditValue; sent: EditValue; stored: EditValue };

type EndpointAnswer = { refusal: SaveRefusal | null; stored: unknown; autosaves: boolean };

type PostedAnswer = { refusal: SaveRefusal | null; isLatest: boolean };

type PageLeave = { left: Promise<void>; leave: () => void };

const nextPageLeave = (): PageLeave => {
  let leave: PageLeave["leave"] | undefined;
  const left = new Promise<void>((resolve) => {
    leave = resolve;
  });
  return { leave: () => leave?.(), left };
};

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
    if (!isSavedBy(response, answer) || !isPlainObject(answer)) {
      return { autosaves: true, refusal: readSaveRefusal(answer), stored: undefined };
    }
    return { autosaves: answer.autosave !== false, refusal: null, stored: answer.value };
  } catch {
    return { autosaves: true, refusal: SAVE_FAILED, stored: undefined };
  }
};

export function createEditTransport(
  getCtx: () => EditTransportCtx,
  onStatus: OnStatus,
  win: Window = window,
  findAdmin: FindAdminOf = () => findAdminWindow(win)
): EditTransport {
  const waiting = new Map<string, WaitingEdit>();
  const failed = new Map<string, FailedEdit>();
  const postedToAdmin = new Map<string, VeEdit>();
  const unsavedInForm = new Map<string, EditedField>();
  const watchedSaves = new Map<string, OnSaveEnded>();
  const savesOnTheWay = new Map<string, number>();
  const savedEdits = new Map<string, SavedEdit>();
  const latestPosted = new Map<string, VeEdit>();
  const givenToForm = new Map<string, EditValue>();
  const latestQueued = new Map<string, VeEdit>();
  const savedWhenEditsEnd = new Set<string>();
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

  const fail = (field: EditedField, failure: FailedEdit) => {
    failed.delete(editedFieldAddressOf(field));
    failed.set(editedFieldAddressOf(field), failure);
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
    savedEdits.set(editedFieldAddressOf(edit), {
      sent: valueOf(edit),
      startedFrom: continued?.startedFrom ?? edit.base,
      stored: storedValueOf(edit, stored),
    });
  };

  const startingValuesOf = (edit: VeEdit, continued: SavedEdit | null): VeEdit => {
    const address = editedFieldAddressOf(edit);
    const rebased = continued ? withStartingValue(edit, "base", continued.stored) : edit;
    const earlier = latestPosted.get(address);
    const sentBefore = earlier ? valueOf(earlier) : givenToForm.get(address);
    return sentBefore !== undefined && edit.base !== undefined
      ? withStartingValue(rebased, "sentBefore", sentBefore)
      : rebased;
  };

  const post = async (edit: VeEdit): Promise<PostedAnswer> => {
    const address = editedFieldAddressOf(edit);
    if (isChangedElsewhere(address)) return { isLatest: true, refusal: CHANGED_ELSEWHERE };
    const saved = savedEdits.get(address);
    const continued = continuesSaved(edit, saved) ? saved : null;
    const posted = startingValuesOf(edit, continued);
    latestPosted.set(address, edit);
    const { autosaves, refusal, stored } = await postToEndpoint(
      win,
      `${getCtx().payloadApi}${VE_FIELD_EDIT_PATH}`,
      posted
    );
    if (!autosaves) savedWhenEditsEnd.add(documentAddressOf(edit));
    const isLatest = latestPosted.get(address) === edit;
    if (isLatest) latestPosted.delete(address);
    if (isLatest && refusal === null) {
      givenToForm.delete(address);
      rememberSaved(edit, continued, stored);
    }
    return { isLatest, refusal };
  };

  const saveThroughEndpoint = async (edit: VeEdit) => {
    report("saving");
    countSaveOnTheWay(editedFieldAddressOf(edit), 1);
    const { isLatest, refusal } = await post(edit);
    const isSaved = refusal === null;
    countSaveOnTheWay(editedFieldAddressOf(edit), -1);
    if (isLatest && isSaved) failed.delete(editedFieldAddressOf(edit));
    else if (isLatest && refusal) fail(edit, { edit, refusal });
    report(statusAfterASave());
    if (isDisposed || !isLatest) return;
    watchedSaves.get(editedFieldAddressOf(edit))?.(isSaved);
    if (isSaved) getCtx().onEdited?.();
  };

  const saveAfter = async (earlierSaves: Promise<void>, edit: VeEdit) => {
    const address = editedFieldAddressOf(edit);
    latestQueued.set(address, edit);
    countSaveOnTheWay(address, 1);
    await Promise.race([earlierSaves, pageLeave.left]);
    countSaveOnTheWay(address, -1);
    if (latestQueued.get(address) !== edit) return;
    latestQueued.delete(address);
    await saveThroughEndpoint(edit);
  };

  const deliver = (edit: VeEdit) => {
    const adminWindow = findAdmin(edit);
    if (!adminWindow) {
      saves = saveAfter(saves, edit);
      return;
    }
    savedEdits.delete(editedFieldAddressOf(edit));
    givenToForm.set(editedFieldAddressOf(edit), valueOf(edit));
    failed.delete(editedFieldAddressOf(edit));
    postedToAdmin.set(editedFieldAddressOf(edit), edit);
    unsavedInForm.set(editedFieldAddressOf(edit), edit);
    adminWindow.postMessage(messageOf(edit), adminOriginOf(getCtx().adminOrigin));
  };

  const stopWaiting = (address: string): WaitingEdit | null => {
    const held = waiting.get(address) ?? null;
    if (held?.timer) clearTimeout(held.timer);
    waiting.delete(address);
    return held;
  };

  const pauseBeforeSending = (edit: VeEdit): number =>
    findAdmin(edit) ? EDIT_SEND_PAUSE_MS : EDIT_SAVE_PAUSE_MS;

  const isSavedWhenTheEditEnds = (edit: VeEdit): boolean =>
    !findAdmin(edit) && savedWhenEditsEnd.has(documentAddressOf(edit));

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
      if (stopWaiting(editedFieldAddressOf(field)) && isIdle()) settle();
    },
    hold(edit) {
      const address = editedFieldAddressOf(edit);
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
    refuse(field, refusal = SAVE_FAILED) {
      const edit = postedToAdmin.get(editedFieldAddressOf(field));
      if (!edit) return;
      fail(edit, { edit, refusal });
      report("failed");
    },
    refuseAsked(field, refusal, askAgain) {
      fail(field, { askAgain, refusal });
      report("failed");
    },
    retry() {
      const refused = [...failed.values()];
      failed.clear();
      for (const failure of refused) {
        if ("edit" in failure) deliver(failure.edit);
        else failure.askAgain();
      }
      if (unsavedInForm.size > 0) report("unsaved");
    },
    send(edit, onDelivered) {
      const address = editedFieldAddressOf(edit);
      supersede(address);
      watchedSaves.delete(address);
      const timer = isSavedWhenTheEditEnds(edit)
        ? null
        : setTimeout(deliverWaiting, pauseBeforeSending(edit), address);
      waiting.set(address, { edit, onDelivered, timer });
      report("unsaved");
    },
    sendNow(edit, onSaveEnded) {
      const address = editedFieldAddressOf(edit);
      supersede(address);
      if (onSaveEnded) watchedSaves.set(address, onSaveEnded);
      else watchedSaves.delete(address);
      report("unsaved");
      deliver(edit);
    },
    isUnsaved(field) {
      const address = editedFieldAddressOf(field);
      return waiting.has(address) || savesOnTheWay.has(address) || failed.has(address);
    },
    holdInForm(field) {
      failed.delete(editedFieldAddressOf(field));
      unsavedInForm.set(editedFieldAddressOf(field), field);
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
