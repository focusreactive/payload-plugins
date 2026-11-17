import type { VeFieldEdit, VeFieldEditMessage } from "../../shared/protocol.js";

import { isPlainObject } from "../../shared/plainObject.js";
import { VE_FIELD_EDIT_PATH, VE_FIELD_EDIT_TYPE } from "../../shared/protocol.js";
import { keyedFieldAddressOf } from "../../shared/veDocument.js";
import { adminOriginOf, findAdminWindow } from "../adminWindow.js";

export type EditStatus = "failed" | "saved" | "saving" | "unsaved";

export type EditTransportCtx = { adminOrigin: string; payloadApi: string };

export interface EditTransport {
  send(edit: VeFieldEdit): void;
  flush(): void;
  retry(): void;
  dispose(): void;
}

export const EDIT_SEND_PAUSE_MS = 400;

type WaitingEdit = { edit: VeFieldEdit; timer: ReturnType<typeof setTimeout> };

const addressOf = (edit: VeFieldEdit): string =>
  JSON.stringify([keyedFieldAddressOf(edit), edit.locale ?? null]);

const postToEndpoint = async (win: Window, url: string, edit: VeFieldEdit): Promise<boolean> => {
  try {
    const response = await win.fetch(url, {
      body: JSON.stringify(edit),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
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
  let saves: Promise<void> = Promise.resolve();
  let failed: VeFieldEdit | null = null;
  let isDisposed = false;

  const report = (status: EditStatus) => {
    if (!isDisposed) onStatus(status);
  };

  const saveThroughEndpoint = async (edit: VeFieldEdit) => {
    report("saving");
    const isSaved = await postToEndpoint(win, `${getCtx().payloadApi}${VE_FIELD_EDIT_PATH}`, edit);
    failed = isSaved ? null : edit;
    report(isSaved ? "saved" : "failed");
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
    retry() {
      if (!failed) return;
      const edit = failed;
      failed = null;
      deliver(edit);
    },
    send(edit) {
      const address = addressOf(edit);
      const held = waiting.get(address);
      if (held) clearTimeout(held.timer);
      const timer = setTimeout(deliverWaiting, EDIT_SEND_PAUSE_MS, address);
      waiting.set(address, { edit, timer });
      report("unsaved");
    },
  };
}
