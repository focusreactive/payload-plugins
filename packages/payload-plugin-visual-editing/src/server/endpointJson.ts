import type { PayloadRequest } from "payload";

import { readJsonBody } from "./unsavedRichText/jsonBody.js";

const MAX_BODY_BYTES = 4 * 1024 * 1024;
const BODY_TIME_LIMIT_MS = 10_000;
const JSON_MEDIA_TYPE = "application/json";

export const json = (body: unknown, status: number): Response =>
  Response.json(body, { headers: { "Cache-Control": "no-store" }, status });

const parsed = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const readBody = async (req: PayloadRequest): Promise<unknown> => {
  if (Number(req.headers.get("Content-Length") ?? 0) > MAX_BODY_BYTES) return null;
  if (req.body instanceof ReadableStream) {
    return readJsonBody(req as Request, MAX_BODY_BYTES, AbortSignal.timeout(BODY_TIME_LIMIT_MS));
  }
  const text = req.text ? await req.text() : "";
  return text.length > MAX_BODY_BYTES ? null : parsed(text);
};

export const bodyOf = async (req: PayloadRequest): Promise<unknown> => {
  try {
    return await readBody(req);
  } catch {
    return null;
  }
};

const isSentAsJson = (req: PayloadRequest): boolean =>
  req.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase() === JSON_MEDIA_TYPE;

export const jsonBodyOf = async (req: PayloadRequest): Promise<unknown> =>
  isSentAsJson(req) ? bodyOf(req) : null;
