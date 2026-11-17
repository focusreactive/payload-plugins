import { createHmac, timingSafeEqual } from "node:crypto";

import { isPlainObject } from "../shared/plainObject.js";

export const PREVIEW_GRANT_TTL_MS = 10 * 60 * 1000;

export type PreviewGrant = {
  document: string;
  expiresAt: number;
  userCollection: string;
  userId: number | string;
};

const SEPARATOR = ".";

const KEY_LABEL = "visual-editing/preview-grant/v1";

const keyOf = (secret: string): Buffer => createHmac("sha256", secret).update(KEY_LABEL).digest();

const signatureOf = (payload: string, secret: string): Buffer =>
  createHmac("sha256", keyOf(secret)).update(payload).digest();

const isGrant = (value: unknown): value is PreviewGrant =>
  isPlainObject(value) &&
  typeof value.document === "string" &&
  typeof value.expiresAt === "number" &&
  typeof value.userCollection === "string" &&
  (typeof value.userId === "string" || typeof value.userId === "number");

export const signPreviewGrant = (grant: PreviewGrant, secret: string): string => {
  const payload = Buffer.from(JSON.stringify(grant)).toString("base64url");
  return `${payload}${SEPARATOR}${signatureOf(payload, secret).toString("base64url")}`;
};

const parse = (payload: string): unknown => {
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
};

export const readPreviewGrant = (
  token: unknown,
  secret: string,
  now: number
): PreviewGrant | null => {
  if (typeof token !== "string") return null;
  const [payload, signature, ...rest] = token.split(SEPARATOR);
  if (!payload || !signature || rest.length > 0) return null;

  const expected = signatureOf(payload, secret);
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  const grant = parse(payload);
  return isGrant(grant) && grant.expiresAt > now ? grant : null;
};
