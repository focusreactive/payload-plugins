import type { Payload } from "payload";

import type { LatestReads } from "./server/unsavedRichText/latestReads.js";
import type {
  PostedReadLimits,
  PostedRequest,
  SignedIn,
  Unsaved,
} from "./server/unsavedRichText/postedRequest.js";
import type {
  ReadAsUserOptions,
  UnsavedRichTextDepth,
} from "./server/unsavedRichText/readAsUser.js";

import { createLatestReads } from "./server/unsavedRichText/latestReads.js";
import {
  checkAndSignIn,
  readUnsaved,
  signInAndReadBody,
} from "./server/unsavedRichText/postedRequest.js";
import { readAsUser, readKeyOf } from "./server/unsavedRichText/readAsUser.js";
import { MAX_POSTED_EDITOR_STATE_LENGTH } from "./shared/richText/postedEditorState.js";

export type { UnsavedRichTextDepth } from "./server/unsavedRichText/readAsUser.js";

export const DEFAULT_MAX_UNSAVED_STATE_LENGTH = MAX_POSTED_EDITOR_STATE_LENGTH;
export const DEFAULT_UNSAVED_READ_TIME_LIMIT_MS = 3000;

const UNSAVED_READ_FAILURE_MESSAGE = "Reading an unsaved rich text state failed";
const RUNNING_READ_STALE_AFTER_TIME_LIMITS = 3;

export type ReadUnsavedRichTextArgs = PostedRequest & {
  payload: Payload;
  depth?: UnsavedRichTextDepth;
  maxStateLength?: number;
  timeLimitMs?: number;
  readWholeDocument?: boolean;
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

type ReadOptions = PostedReadLimits &
  ReadAsUserOptions & {
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

type SignIn = (options: ReadOptions) => Promise<SignedIn | null>;

const readSignedInAsUser = async <Content>(
  payload: Payload,
  signIn: SignIn,
  options: ReadOptions
): Promise<Content | null> => {
  const signedIn = await nullOnFailure(() => signIn(options));
  if (!signedIn || options.signal.aborted) return null;

  const { unsaved, user } = signedIn;
  const logFailure = (err: unknown) =>
    payload.logger.error({ err, msg: UNSAVED_READ_FAILURE_MESSAGE });
  const readOnce = () =>
    nullOnFailure(() => readAsUser<Content>(payload, user, unsaved, options), logFailure);
  return latestReadsOf(payload).read(readKeyOf(user, unsaved), readOnce, {
    signal: options.signal,
    staleAfterMs: options.timeLimitMs * RUNNING_READ_STALE_AFTER_TIME_LIMITS,
  });
};

const signInFromPosted =
  (payload: Payload, { headers, request }: PostedRequest): SignIn =>
  (options) =>
    request instanceof Request
      ? signInAndReadBody(payload, request, options)
      : checkAndSignIn(payload, request, headers, options);

type ReadLimits = {
  depth?: UnsavedRichTextDepth;
  maxStateLength?: number;
  timeLimitMs?: number;
  readWholeDocument?: boolean;
};

type ReadRules = ReadLimits & { savedReferencesOnly: boolean };

const readWithinLimits = async <Content>(
  payload: Payload,
  signIn: SignIn,
  {
    depth,
    maxStateLength = DEFAULT_MAX_UNSAVED_STATE_LENGTH,
    readWholeDocument = false,
    savedReferencesOnly,
    timeLimitMs = DEFAULT_UNSAVED_READ_TIME_LIMIT_MS,
  }: ReadRules,
  requestSignal: AbortSignal | undefined
): Promise<Content | null> => {
  const { nothing, signal, stop } = deadlineAfter(timeLimitMs, requestSignal);
  const options = {
    depth,
    maxStateLength,
    readWholeDocument,
    savedReferencesOnly,
    signal,
    timeLimitMs,
  };
  try {
    return await Promise.race([readSignedInAsUser<Content>(payload, signIn, options), nothing]);
  } finally {
    stop();
  }
};

export type ReadUnsavedRichTextForArgs = ReadLimits & {
  payload: Payload;
  request: unknown;
  user: SignedIn["user"];
  allows: (unsaved: Unsaved) => boolean;
};

export const readUnsavedRichTextFor = <Content = unknown>({
  allows,
  payload,
  request,
  user,
  ...limits
}: ReadUnsavedRichTextForArgs): Promise<Content | null> =>
  readWithinLimits<Content>(
    payload,
    async ({ maxStateLength }) => {
      const unsaved = readUnsaved(payload, request, maxStateLength);
      return unsaved && allows(unsaved) ? { unsaved, user } : null;
    },
    { ...limits, savedReferencesOnly: true },
    undefined
  );

export const readUnsavedRichText = <Content = unknown>({
  depth,
  maxStateLength,
  payload,
  readWholeDocument,
  timeLimitMs,
  ...posted
}: ReadUnsavedRichTextArgs): Promise<Content | null> =>
  readWithinLimits<Content>(
    payload,
    signInFromPosted(payload, posted),
    { depth, maxStateLength, readWholeDocument, savedReferencesOnly: false, timeLimitMs },
    posted.request instanceof Request ? posted.request.signal : undefined
  );
