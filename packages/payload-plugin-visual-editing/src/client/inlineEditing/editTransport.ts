import type { VeFieldEdit, VeFieldEditMessage, VeLiveDocument } from "../../shared/protocol.js";

import { isPlainObject } from "../../shared/plainObject.js";
import { VE_FIELD_EDIT_PATH, VE_FIELD_EDIT_TYPE } from "../../shared/protocol.js";
import { documentAddressOf, keyedFieldAddressOf } from "../../shared/veDocument.js";
import { adminOriginOf, findAdminWindow } from "../adminWindow.js";

export type EditStatus = "failed" | "saved" | "saving" | "unsaved";

export type EditTransportCtx = { adminOrigin: string; payloadApi: string };

export type EditedField = Omit<VeFieldEdit, "value">;

export interface EditTransport {
  send(edit: VeFieldEdit): void;
  flush(): void;
  refuse(field: EditedField): void;
  settle(saved: VeLiveDocument | null): void;
  retry(): void;
  dispose(): void;
}

export const EDIT_SEND_PAUSE_MS = 400;

export const EDIT_SAVE_PAUSE_MS = 2000;

type WaitingEdit = { edit: VeFieldEdit; timer: ReturnType<typeof setTimeout> };

const addressOf = (field: EditedField): string =>
  JSON.stringify([keyedFieldAddressOf(field), field.locale ?? null]);

const isSavedWith = (edit: VeFieldEdit, saved: VeLiveDocument): boolean =>
  documentAddressOf(edit) === documentAddressOf(saved) &&
  (!edit.locale || !saved.locale || edit.locale === saved.locale);

const postToEndpoint = async (win: Window, url: string, edit: VeFieldEdit): Promise<boolean> => {
  try {
    const response = await win.fetch(url, {
      body: JSON.stringify(edit),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      method: "POST",
    });
    const answer: unknown = response.ok ? await response.json() : null;
    return isPlainObject(answer) && answer.saved === true;
  } catch {
    return false;
  }
};

export function createEditTransport(
  getCtx: () => EditTransportCtx,
  onStatus: (status: EditStatus) => void,
  win: Window = window
): EditTransport {
  const waiting = new Map<string, WaitingEdit>();
  const failed = new Map<string, VeFieldEdit>();
  const postedToAdmin = new Map<string, VeFieldEdit>();
  let saves: Promise<void> = Promise.resolve();
  let isDisposed = false;

  const report = (status: EditStatus) => {
    if (!isDisposed) onStatus(status);
  };

  const settle = () => report(failed.size > 0 ? "failed" : "saved");

  const saveThroughEndpoint = async (edit: VeFieldEdit) => {
    report("saving");
    const isSaved = await postToEndpoint(win, `${getCtx().payloadApi}${VE_FIELD_EDIT_PATH}`, edit);
    if (isSaved) failed.delete(addressOf(edit));
    else failed.set(addressOf(edit), edit);
    settle();
  };

  const saveAfter = async (earlierSaves: Promise<void>, edit: VeFieldEdit) => {
    await earlierSaves;
    await saveThroughEndpoint(edit);
  };

  const deliver = (edit: VeFieldEdit) => {
    const adminWindow = findAdminWindow(win);
    if (!adminWindow) {
      saves = saveAfter(saves, edit);
      return;
    }
    const message: VeFieldEditMessage = { ...edit, type: VE_FIELD_EDIT_TYPE };
    failed.delete(addressOf(edit));
    postedToAdmin.set(addressOf(edit), edit);
    adminWindow.postMessage(message, adminOriginOf(getCtx().adminOrigin));
  };

  const deliverWaiting = (address: string) => {
    const held = waiting.get(address);
    if (!held) return;
    clearTimeout(held.timer);
    waiting.delete(address);
    deliver(held.edit);
  };

  const flush = () => {
    for (const address of [...waiting.keys()]) deliverWaiting(address);
  };

  return {
    dispose() {
      flush();
      isDisposed = true;
    },
    flush,
    refuse(field) {
      const edit = postedToAdmin.get(addressOf(field));
      if (!edit) return;
      failed.set(addressOf(field), edit);
      report("failed");
    },
    retry() {
      const edits = [...failed.values()];
      failed.clear();
      for (const edit of edits) deliver(edit);
    },
    send(edit) {
      const address = addressOf(edit);
      const held = waiting.get(address);
      if (held) clearTimeout(held.timer);
      const pause = findAdminWindow(win) ? EDIT_SEND_PAUSE_MS : EDIT_SAVE_PAUSE_MS;
      const timer = setTimeout(deliverWaiting, pause, address);
      waiting.set(address, { edit, timer });
      report("unsaved");
    },
    settle(saved) {
      for (const [address, edit] of postedToAdmin) {
        if (!saved || isSavedWith(edit, saved)) postedToAdmin.delete(address);
      }
      if (postedToAdmin.size === 0) settle();
    },
  };
}
