import type { Payload } from "payload";

import type { LatestReads } from "./server/unsavedRichText/latestReads.js";
import type { PostedReadLimits, PostedRequest } from "./server/unsavedRichText/postedRequest.js";
import type { UnsavedRichTextDepth } from "./server/unsavedRichText/readAsUser.js";

import { createLatestReads } from "./server/unsavedRichText/latestReads.js";
import { checkAndSignIn, signInAndReadBody } from "./server/unsavedRichText/postedRequest.js";
import { readAsUser, readKeyOf } from "./server/unsavedRichText/readAsUser.js";

export type { UnsavedRichTextDepth } from "./server/unsavedRichText/readAsUser.js";

export const DEFAULT_MAX_UNSAVED_STATE_LENGTH = 1_000_000;
export const DEFAULT_UNSAVED_READ_TIME_LIMIT_MS = 3000;

const UNSAVED_READ_FAILURE_MESSAGE = "Reading an unsaved rich text state failed";
const RUNNING_READ_STALE_AFTER_TIME_LIMITS = 3;

export type ReadUnsavedRichTextArgs = PostedRequest & {
  payload: Payload;
  depth?: UnsavedRichTextDepth;
  maxStateLength?: number;
  timeLimitMs?: number;
};

const latestReadsByPayload = new WeakMap<Payload, LatestReads>();

const latestReadsOf = (payload: Payload): LatestReads => {
  const latestReads = latestReadsByPayload.get(payload) ?? createLatestReads(new Map());
  latestReadsByPayload.set(payload, latestReads);
  return latestReads;
};

const deadlineAfter = (timeLimitMs: number, requestSignal: AbortSignal | undefined) => {
  const reached = new AbortController();
  const signal = requestSignal ? AbortSignal.any([reached.signal, requestSignal]) : reached.signal;
  const timer = setTimeout(() => reached.abort(), timeLimitMs);
  const nothing = new Promise<null>((resolve) => {
    if (signal.aborted) resolve(null);
    signal.addEventListener("abort", () => resolve(null), { once: true });
  });
  return { nothing, signal, stop: () => clearTimeout(timer) };
};

type ReadOptions = PostedReadLimits & {
  depth: UnsavedRichTextDepth | undefined;
  timeLimitMs: number;
};

const ignoreFailure = (): void => undefined;

const nullOnFailure = async <Value>(
  work: () => Promise<Value>,
  onFailure: (err: unknown) => void = ignoreFailure
): Promise<Value | null> => {
  try {
    return await work();
  } catch (err) {
    onFailure(err);
    return null;
  }
};

const readPostedAsUser = async <Content>(
  payload: Payload,
  { headers, request }: PostedRequest,
  options: ReadOptions
): Promise<Content | null> => {
  const signedIn = await nullOnFailure(() =>
    request instanceof Request
      ? signInAndReadBody(payload, request, options)
      : checkAndSignIn(payload, request, headers, options)
  );
  if (!signedIn || options.signal.aborted) return null;
  const { unsaved, user } = signedIn;
  const logFailure = (err: unknown) =>
    payload.logger.error({ err, msg: UNSAVED_READ_FAILURE_MESSAGE });
  const readOnce = () =>
    nullOnFailure(() => readAsUser<Content>(payload, user, unsaved, options.depth), logFailure);
  return latestReadsOf(payload).read(readKeyOf(user, unsaved), readOnce, {
    signal: options.signal,
    staleAfterMs: options.timeLimitMs * RUNNING_READ_STALE_AFTER_TIME_LIMITS,
  });
};

export const readUnsavedRichText = async <Content = unknown>({
  depth,
  maxStateLength = DEFAULT_MAX_UNSAVED_STATE_LENGTH,
  payload,
  timeLimitMs = DEFAULT_UNSAVED_READ_TIME_LIMIT_MS,
  ...posted
}: ReadUnsavedRichTextArgs): Promise<Content | null> => {
  const requestSignal = posted.request instanceof Request ? posted.request.signal : undefined;
  const { nothing, signal, stop } = deadlineAfter(timeLimitMs, requestSignal);
  const options = { depth, maxStateLength, signal, timeLimitMs };
  try {
    return await Promise.race([readPostedAsUser<Content>(payload, posted, options), nothing]);
  } finally {
    stop();
  }
};
