import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { FolderId } from "../types.js";

export const confirmationTokenVersion = 1;
export const confirmationTokenLifetimeSeconds = 900;

export type ConfirmationTokenKind = "move" | "rename";

export type ConfirmationTokenUser = { collection: string; id: FolderId };

export type ConfirmationTokenBody = {
  /** Hash of what the user was asked to confirm; the apply plans again and compares. */
  digest: string;
  /** Milliseconds since the epoch. */
  expiresAt: number;
  kind: ConfirmationTokenKind;
  /** The request as the preview normalized it, so the apply plans the same change. */
  request: Record<string, unknown>;
  user: ConfirmationTokenUser;
  version: typeof confirmationTokenVersion;
};

export type ConfirmationTokenVerdict =
  | { body: ConfirmationTokenBody; ok: true }
  | { message: string; ok: false };

// A label under the secret gives the signing key, so the raw secret never signs a token and a key
// for another purpose derived the same way would not verify these tokens.
const keyLabel = "folders-mcp-confirmation-token";

let readClock = (): number => Date.now();

/** Replaces the clock the token reads, so a test can prove expiry without waiting; returns the old one. */
export const setConfirmationTokenClock = (clock: () => number): (() => number) => {
  const previous = readClock;
  readClock = clock;

  return previous;
};

export const currentConfirmationTime = (): number => readClock();

const signingKeyOf = (secret: string): Buffer =>
  createHmac("sha256", secret).update(keyLabel).digest();

const signatureOf = (secret: string, bodyPart: string): Buffer =>
  createHmac("sha256", signingKeyOf(secret)).update(bodyPart).digest();

const previewAgain = "Preview again and use the new token.";

const refuse = (message: string): ConfirmationTokenVerdict => ({ message, ok: false });

export const issueConfirmationToken = ({
  digest,
  kind,
  now = readClock(),
  request,
  secret,
  user,
}: {
  digest: string;
  kind: ConfirmationTokenKind;
  now?: number;
  request: Record<string, unknown>;
  secret: string;
  user: ConfirmationTokenUser;
}): string => {
  const body: ConfirmationTokenBody = {
    digest,
    expiresAt: now + confirmationTokenLifetimeSeconds * 1000,
    kind,
    request,
    user,
    version: confirmationTokenVersion,
  };
  const bodyPart = Buffer.from(JSON.stringify(body)).toString("base64url");

  return `${bodyPart}.${signatureOf(secret, bodyPart).toString("base64url")}`;
};

const hasValidSignature = (secret: string, bodyPart: string, signaturePart: string): boolean => {
  const given = Buffer.from(signaturePart, "base64url");
  const expected = signatureOf(secret, bodyPart);

  return given.length === expected.length && timingSafeEqual(given, expected);
};

const isBodyShape = (value: unknown): value is ConfirmationTokenBody => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const body = value as Record<string, unknown>;
  const user = body.user as Record<string, unknown> | null | undefined;

  return (
    typeof body.digest === "string" &&
    typeof body.expiresAt === "number" &&
    typeof body.request === "object" &&
    body.request !== null &&
    typeof user === "object" &&
    user !== null &&
    typeof user.collection === "string" &&
    (typeof user.id === "number" || typeof user.id === "string")
  );
};

/**
 * Checks a token in the order that never reads unsigned data: the signature first (constant-time),
 * then the version and kind, then who it was issued to, then the expiry. Every refusal says what the
 * model does next.
 */
export const verifyConfirmationToken = ({
  now = readClock(),
  secret,
  token,
  user,
}: {
  now?: number;
  secret: string;
  token: string;
  user: ConfirmationTokenUser;
}): ConfirmationTokenVerdict => {
  const parts = typeof token === "string" ? token.split(".") : [];
  if (parts.length !== 2 || parts[0] === "" || parts[1] === "") {
    return refuse(`The confirmation token is not valid. ${previewAgain}`);
  }
  const [bodyPart, signaturePart] = parts;
  if (!hasValidSignature(secret, bodyPart, signaturePart)) {
    return refuse(`The confirmation token is not valid. ${previewAgain}`);
  }

  let body: unknown;
  try {
    body = JSON.parse(Buffer.from(bodyPart, "base64url").toString("utf-8"));
  } catch {
    return refuse(`The confirmation token is not valid. ${previewAgain}`);
  }
  if (!isBodyShape(body)) {
    return refuse(`The confirmation token is not valid. ${previewAgain}`);
  }
  if (body.version !== confirmationTokenVersion) {
    return refuse(`The confirmation token is from another version of this tool. ${previewAgain}`);
  }
  if ((body.kind as string) !== "move" && (body.kind as string) !== "rename") {
    return refuse(
      `The confirmation token is for a change this tool does not know. ${previewAgain}`
    );
  }
  if (body.user.collection !== user.collection || String(body.user.id) !== String(user.id)) {
    return refuse(
      "This confirmation token was issued to another user. Preview again as the current user and use the new token."
    );
  }
  if (now >= body.expiresAt) {
    return refuse(
      `The confirmation token expired after ${confirmationTokenLifetimeSeconds / 60} minutes. Preview again, show the user the new summary and use the new token.`
    );
  }

  return { body, ok: true };
};

type DigestChange = { from: string; locale: string | null; to: string };

/**
 * A hash of what the user is asked to confirm: the counts and every published URL change of the
 * plan, not only the examples. Both are put in a fixed order first, and each change is a list of
 * three values, so no change can read as another.
 */
export const buildPlanDigest = ({
  changes,
  counts,
}: {
  changes: DigestChange[];
  counts: Record<string, number>;
}): string => {
  const sortedCounts = Object.entries(counts).sort(([left], [right]) => left.localeCompare(right));
  const sortedChanges = changes
    .map((change) => [change.locale ?? "", change.from, change.to])
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));

  return createHash("sha256")
    .update(JSON.stringify([sortedCounts, sortedChanges]))
    .digest("hex");
};
