import type { SaveRefusal } from "../../shared/fieldEdit.js";
import type {
  VeEdit,
  VeEditedField,
  VeEditorState,
  VeFieldEditMessage,
  VeLiveDocument,
  VeMediaOption,
  VePickMediaMessage,
  VeRichTextEditEndedMessage,
  VeRichTextEditMessage,
  VeShownMedia,
} from "../../shared/protocol.js";
import type { AdminEditChannel, DocumentNews } from "./adminEditChannel.js";
import type { EditRoutes } from "./editRoutes.js";

import { CHANGED_ELSEWHERE, isRichTextEdit, SAVE_FAILED } from "../../shared/fieldEdit.js";
import { isPlainObject } from "../../shared/plainObject.js";
import {
  VE_FIELD_EDIT_PATH,
  VE_FIELD_EDIT_TYPE,
  VE_PICK_MEDIA_TYPE,
  VE_RICH_TEXT_EDIT_ENDED_TYPE,
  VE_RICH_TEXT_EDIT_TYPE,
} from "../../shared/protocol.js";
import { readPostedEditorState } from "../../shared/richText/postedEditorState.js";
import { isSameValue } from "../../shared/sameValue.js";
import { documentAddressOf, editedFieldAddressOf } from "../../shared/veDocument.js";

import { MEDIA_PICK_TIME_LIMIT_MS } from "./adminEditChannel.js";
import { endpointAnswerOf } from "./endpointAnswer.js";

export type EditStatus = "failed" | "in-form" | "saved" | "saving" | "unsaved";

export type EditTransportCtx = { payloadApi: string; onEdited?: () => void };

export type OnStatus = (status: EditStatus, refusal?: SaveRefusal) => void;

export type EditValue = string | VeEditorState;

export interface FieldEdit<Value extends EditValue> {
  change(value: Value): void;
  hold(value: Value): void;
  goesToTheAdmin(): boolean;
  isUnsaved(): boolean;
  cancel(): void;
  end(): void;
}

export type ShownImage = {
  shownMediaId: string | null;
  show(media: VeShownMedia): (() => void) | null;
  openField(): void;
};

export interface ImageEdit {
  pickInTheDrawer(): boolean;
  use(media: VeMediaOption): void;
}

export interface EditTransport {
  beginEdit(field: VeEditedField, startedFrom: string): FieldEdit<string>;
  beginEdit(field: VeEditedField, startedFrom: VeEditorState): FieldEdit<VeEditorState>;
  beginImageEdit(field: VeEditedField, image: ShownImage): ImageEdit;
  retry(): void;
  leavePage(): void;
  dispose(): void;
}

export const EDIT_SEND_PAUSE_MS = 400;

export const EDIT_SAVE_PAUSE_MS = 2000;

type OnSaveEnded = (isSaved: boolean) => void;

type WaitingEdit = {
  edit: VeEdit;
  timer: ReturnType<typeof setTimeout> | null;
  onDelivered?: () => void;
};

type FailedEdit = { refusal: SaveRefusal } & ({ edit: VeEdit } | { askAgain: () => void });

type SavedEdit = { startedFrom: EditValue; sent: EditValue; stored: EditValue };

type EndpointAnswer = { refusal: SaveRefusal | null; stored: unknown; autosaves: boolean };

type PostedAnswer = { refusal: SaveRefusal | null; isLatest: boolean };

type PageLeave = { left: Promise<void>; leave: () => void };

type OpenEdit = { address: string };

type ChosenOnThePage = { media: VeMediaOption; useAgain(): void };

const nextPageLeave = (): PageLeave => {
  let leave: PageLeave["leave"] | undefined;
  const left = new Promise<void>((resolve) => {
    leave = resolve;
  });
  return { leave: () => leave?.(), left };
};

const isSavedWith = (edit: VeEditedField, saved: VeLiveDocument): boolean =>
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

const editOf = (field: VeEditedField, startedFrom: EditValue | null, value: EditValue): VeEdit => {
  if (typeof value === "string") {
    return { ...field, ...(typeof startedFrom === "string" && { base: startedFrom }), value };
  }
  const base = startedFrom === null || typeof startedFrom === "string" ? {} : { base: startedFrom };
  return { ...field, ...base, state: value };
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
    const { answer, refusal } = await endpointAnswerOf(response);
    if (refusal || !isPlainObject(answer) || answer.saved !== true) {
      return { autosaves: true, refusal: refusal ?? SAVE_FAILED, stored: undefined };
    }
    return { autosaves: answer.autosave !== false, refusal: null, stored: answer.value };
  } catch {
    return { autosaves: true, refusal: SAVE_FAILED, stored: undefined };
  }
};

export function createEditTransport(
  getCtx: () => EditTransportCtx,
  onStatus: OnStatus,
  win: Window,
  routes: EditRoutes,
  channel: AdminEditChannel
): EditTransport {
  const { adminOf } = routes;
  const waiting = new Map<string, WaitingEdit>();
  const failed = new Map<string, FailedEdit>();
  const postedToAdmin = new Map<string, VeEdit>();
  const unsavedInForm = new Map<string, VeEditedField>();
  const watchedSaves = new Map<string, OnSaveEnded>();
  const savesOnTheWay = new Map<string, number>();
  const savedEdits = new Map<string, SavedEdit>();
  const latestPosted = new Map<string, VeEdit>();
  const givenToForm = new Map<string, EditValue>();
  const latestQueued = new Map<string, VeEdit>();
  const savedWhenEditsEnd = new Set<string>();
  let saves: Promise<void> = Promise.resolve();
  let pageLeave = nextPageLeave();
  let openEdit: OpenEdit | null = null;
  let isDisposed = false;

  const latestRefusal = (): SaveRefusal | undefined => [...failed.values()].at(-1)?.refusal;

  const isUnsaved = (address: string): boolean =>
    waiting.has(address) ||
    savesOnTheWay.has(address) ||
    failed.has(address) ||
    unsavedInForm.has(address);

  const isFinished = (field: VeEditedField): boolean => {
    const address = editedFieldAddressOf(field);
    return (
      address !== openEdit?.address && !isUnsaved(address) && !channel.mediaPicks.isAsked(field)
    );
  };

  const releaseFinishedRoutes = () => routes.releaseFinished(isFinished);

  const report = (status: EditStatus) => {
    if (isDisposed) return;
    const refusal = latestRefusal();
    if (refusal === undefined) onStatus(status);
    else onStatus("failed", refusal);
    releaseFinishedRoutes();
  };

  const statusAfterASave = (): EditStatus => {
    if (waiting.size > 0) return "unsaved";
    if (unsavedInForm.size > 0) return "in-form";
    if (savesOnTheWay.size > 0) return "saving";
    return "saved";
  };

  const fail = (field: VeEditedField, failure: FailedEdit) => {
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

  const rememberSaved = (edit: VeEdit, stored: unknown) => {
    if (edit.base === undefined) return;
    savedEdits.set(editedFieldAddressOf(edit), {
      sent: valueOf(edit),
      startedFrom: edit.base,
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
      unsavedInForm.delete(address);
      postedToAdmin.delete(address);
      rememberSaved(edit, stored);
    }
    return { isLatest, refusal };
  };

  const saveThroughEndpoint = async (edit: VeEdit) => {
    countSaveOnTheWay(editedFieldAddressOf(edit), 1);
    report("saving");
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
    const adminWindow = adminOf(edit);
    if (!adminWindow) {
      saves = saveAfter(saves, edit);
      return;
    }
    savedEdits.delete(editedFieldAddressOf(edit));
    givenToForm.set(editedFieldAddressOf(edit), valueOf(edit));
    failed.delete(editedFieldAddressOf(edit));
    postedToAdmin.set(editedFieldAddressOf(edit), edit);
    unsavedInForm.set(editedFieldAddressOf(edit), edit);
    channel.tell(adminWindow, messageOf(edit));
  };

  const stopWaiting = (address: string): WaitingEdit | null => {
    const held = waiting.get(address) ?? null;
    if (held?.timer) clearTimeout(held.timer);
    waiting.delete(address);
    return held;
  };

  const pauseBeforeSending = (edit: VeEdit): number =>
    adminOf(edit) ? EDIT_SEND_PAUSE_MS : EDIT_SAVE_PAUSE_MS;

  const isSavedWhenTheEditEnds = (edit: VeEdit): boolean =>
    !adminOf(edit) && savedWhenEditsEnd.has(documentAddressOf(edit));

  const isIdle = (): boolean =>
    waiting.size === 0 && savesOnTheWay.size === 0 && unsavedInForm.size === 0;

  const deliverWaiting = (address: string) => {
    const held = stopWaiting(address);
    if (!held) return;
    held.onDelivered?.();
    deliver(held.edit);
    if (adminOf(held.edit)) report(statusAfterASave());
  };

  const supersede = (address: string) => {
    stopWaiting(address);
    if (!isChangedElsewhere(address)) failed.delete(address);
  };

  const flush = () => {
    for (const address of [...waiting.keys()]) deliverWaiting(address);
  };

  const drop = (address: string) => {
    if (stopWaiting(address) && isIdle()) report("saved");
  };

  const send = (edit: VeEdit, onDelivered?: () => void) => {
    const address = editedFieldAddressOf(edit);
    supersede(address);
    watchedSaves.delete(address);
    const timer = isSavedWhenTheEditEnds(edit)
      ? null
      : setTimeout(deliverWaiting, pauseBeforeSending(edit), address);
    waiting.set(address, { edit, onDelivered, timer });
    report("unsaved");
  };

  const hold = (edit: VeEdit) => {
    const address = editedFieldAddressOf(edit);
    supersede(address);
    watchedSaves.delete(address);
    waiting.set(address, { edit, timer: null });
    report("unsaved");
  };

  const saveAtOnce = (edit: VeEdit, onSaveEnded: OnSaveEnded) => {
    const address = editedFieldAddressOf(edit);
    supersede(address);
    watchedSaves.set(address, onSaveEnded);
    deliver(edit);
    report(statusAfterASave());
  };

  const holdInForm = (field: VeEditedField) => {
    failed.delete(editedFieldAddressOf(field));
    unsavedInForm.set(editedFieldAddressOf(field), field);
    report("in-form");
  };

  const refuse = (field: VeEditedField, refusal: SaveRefusal) => {
    const edit = postedToAdmin.get(editedFieldAddressOf(field));
    if (!edit) return;
    fail(edit, { edit, refusal });
    report("failed");
  };

  const refuseAsked = (field: VeEditedField, refusal: SaveRefusal, askAgain: () => void) => {
    fail(field, { askAgain, refusal });
    report("failed");
  };

  const settle = ({ document: saved, isSave }: DocumentNews) => {
    if (!isSave || unsavedInForm.size === 0) return;
    for (const [address, field] of unsavedInForm) {
      if (saved && !isSavedWith(field, saved)) continue;
      unsavedInForm.delete(address);
      postedToAdmin.delete(address);
    }
    if (unsavedInForm.size === 0) report(statusAfterASave());
  };

  const open = (field: VeEditedField): OpenEdit => {
    const opened = { address: editedFieldAddressOf(field) };
    openEdit = opened;
    releaseFinishedRoutes();
    routes.pin(field);
    return opened;
  };

  const close = (opened: OpenEdit) => {
    if (openEdit === opened) openEdit = null;
    releaseFinishedRoutes();
  };

  const tellTheAdminTheEditEnded = (field: VeEditedField) => {
    const adminWindow = adminOf(field);
    const message: VeRichTextEditEndedMessage = { ...field, type: VE_RICH_TEXT_EDIT_ENDED_TYPE };
    if (adminWindow) channel.tell(adminWindow, message);
  };

  const askAdmin = (
    adminWindow: Window,
    field: VeEditedField,
    image: ShownImage,
    chosen?: ChosenOnThePage
  ) => {
    if (channel.mediaPicks.isAsked(field, adminWindow)) return;
    const request: VePickMediaMessage = {
      ...field,
      ...(chosen && { mediaId: chosen.media.id }),
      type: VE_PICK_MEDIA_TYPE,
    };
    channel.mediaPicks.ask(adminWindow, request, {
      answered(picked) {
        image.show(picked);
        holdInForm(field);
      },
      cancelled: releaseFinishedRoutes,
      refused(refusal) {
        if (chosen) refuseAsked(field, refusal, chosen.useAgain);
        image.openField();
      },
    });
    setTimeout(releaseFinishedRoutes, MEDIA_PICK_TIME_LIMIT_MS);
    if (chosen) holdInForm(field);
  };

  const saveMediaThroughEndpoint = (
    field: VeEditedField,
    image: ShownImage,
    media: VeMediaOption
  ) => {
    let putBack = image.show(media);
    const followTheSave = (isSaved: boolean) => {
      if (isSaved) putBack ??= image.show(media);
      else putBack?.();
      if (!isSaved) putBack = null;
    };
    saveAtOnce(editOf(field, image.shownMediaId, String(media.id)), followTheSave);
  };

  const useMedia = (field: VeEditedField, image: ShownImage, media: VeMediaOption) => {
    const adminWindow = adminOf(field);
    const useAgain = () => useMedia(field, image, media);
    if (adminWindow) askAdmin(adminWindow, field, image, { media, useAgain });
    else saveMediaThroughEndpoint(field, image, media);
  };

  const stopHearingRefusals = channel.onRefusedEdit(refuse);
  const stopHearingNews = channel.onDocumentNews(settle);

  return {
    beginEdit(field: VeEditedField, startedFrom: EditValue): FieldEdit<EditValue> {
      const opened = open(field);
      const address = editedFieldAddressOf(field);
      const isRichText = typeof startedFrom !== "string";
      let wasChanged = false;
      let wasDelivered = false;

      const goesToTheAdmin = () => adminOf(field) !== null;

      const change = (value: EditValue) => {
        wasChanged = true;
        send(editOf(field, startedFrom, value), () => {
          wasDelivered = true;
        });
      };

      const end = () => {
        deliverWaiting(address);
        if (isRichText) tellTheAdminTheEditEnded(field);
        close(opened);
      };

      return {
        cancel() {
          if (wasChanged) {
            drop(address);
            if (wasDelivered || (isRichText && goesToTheAdmin())) {
              send(editOf(field, startedFrom, startedFrom));
            }
          }
          end();
        },
        change,
        end,
        goesToTheAdmin,
        hold(value) {
          if (goesToTheAdmin()) {
            change(value);
            return;
          }
          wasChanged = true;
          hold(editOf(field, startedFrom, value));
        },
        isUnsaved: () => isUnsaved(address),
      };
    },
    beginImageEdit(field, image) {
      const opened = open(field);
      return {
        pickInTheDrawer() {
          const drawerWindow = routes.drawerOf(field);
          if (!drawerWindow) return false;
          askAdmin(drawerWindow, field, image);
          close(opened);
          return true;
        },
        use(media) {
          useMedia(field, image, media);
          close(opened);
        },
      };
    },
    dispose() {
      flush();
      isDisposed = true;
      stopHearingRefusals();
      stopHearingNews();
    },
    leavePage() {
      flush();
      pageLeave.leave();
      pageLeave = nextPageLeave();
    },
    retry() {
      const refused = [...failed.values()];
      failed.clear();
      for (const failure of refused) {
        if ("edit" in failure) deliver(failure.edit);
        else failure.askAgain();
      }
      if (unsavedInForm.size > 0) report(statusAfterASave());
    },
  };
}
