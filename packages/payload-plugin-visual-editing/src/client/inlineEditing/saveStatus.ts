import type { SaveRefusal } from "../../shared/fieldEdit.js";
import type { EditStatus } from "./editTransport.js";

import { SAVE_FAILED } from "../../shared/fieldEdit.js";

export interface SaveStatus {
  show(status: EditStatus, refusal?: SaveRefusal): void;
  remove(): void;
}

export const DATA_VE_SAVE_STATUS_ATTR = "data-ve-save-status";

export const SAVED_SHOWN_MS = 2000;

const LABELS: Record<EditStatus, string> = {
  failed: "Not saved",
  saved: "Saved",
  saving: "Saving…",
  unsaved: "Unsaved changes",
};

export const REFUSAL_LABELS: Record<SaveRefusal, string> = {
  failed: LABELS.failed,
  locked: "Locked by another editor",
  "no-drafts": "This content has no drafts",
  "not-editable": "This field cannot be edited here",
  "signed-out": "Sign in to the admin to edit",
  unreadable: LABELS.failed,
};

const labelOf = (status: EditStatus, refusal: SaveRefusal): string =>
  status === "failed" ? REFUSAL_LABELS[refusal] : LABELS[status];

const TEMPLATE = `
<style>
  :host {
    all: initial;
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 2147483646;
    --ve-surface: #ffffff;
    --ve-border: rgba(0, 0, 0, 0.1);
    --ve-text: #141414;
  }
  @media (prefers-color-scheme: dark) {
    :host {
      --ve-surface: #222222;
      --ve-border: rgba(255, 255, 255, 0.1);
      --ve-text: #f5f5f5;
    }
  }
  [role="status"] {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 11px;
    background: var(--ve-surface);
    border: 1px solid var(--ve-border);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04), 0 8px 24px -6px rgba(0, 0, 0, 0.14);
    color: var(--ve-text);
    font: 500 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  [role="status"][data-status="failed"] {
    border-color: #f87171;
  }
  button {
    appearance: none;
    border: 0;
    margin: 0;
    padding: 4px 8px;
    border-radius: 6px;
    background: #f87171;
    color: #450a0a;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 2px solid var(--ve-text);
    outline-offset: 1px;
  }
</style>
<div role="status"><span></span><button type="button" hidden>Retry</button></div>
`;

export function createSaveStatus(doc: Document, onRetry: () => void): SaveStatus {
  let host: HTMLElement | null = null;
  let hiding: ReturnType<typeof setTimeout> | null = null;

  const stopHiding = () => {
    if (hiding !== null) clearTimeout(hiding);
    hiding = null;
  };

  const remove = () => {
    stopHiding();
    host?.remove();
    host = null;
  };

  const mount = (): HTMLElement => {
    const mounted = doc.createElement("div");
    mounted.setAttribute(DATA_VE_SAVE_STATUS_ATTR, "");
    const shadow = mounted.attachShadow({ mode: "open" });
    shadow.innerHTML = TEMPLATE;
    shadow.querySelector("button")?.addEventListener("click", onRetry);
    doc.body.append(mounted);
    return mounted;
  };

  return {
    remove,
    show(status, refusal = SAVE_FAILED) {
      stopHiding();
      host ??= mount();
      const shadow = host.shadowRoot;
      const label = shadow?.querySelector("span");
      const retry = shadow?.querySelector("button");
      shadow?.querySelector('[role="status"]')?.setAttribute("data-status", status);
      if (label) label.textContent = labelOf(status, refusal);
      if (retry) retry.hidden = status !== "failed";
      if (status === "saved") hiding = setTimeout(remove, SAVED_SHOWN_MS);
    },
  };
}
