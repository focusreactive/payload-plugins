import type { TranslationLifecycleCallbacks } from "./types.js";

/** `onCompleted` and `onFailed` come from the task handler, wrapped or not. */
export type NeedsDecoration = (callbacks: TranslationLifecycleCallbacks) => boolean;

export const needsDecoration: NeedsDecoration = (callbacks) =>
  Boolean(callbacks.onQueued ?? callbacks.onCancelled);
