import { CTX_WRITTEN_DOCS } from "../constants";

type ReqWithContext = { context?: Record<string, unknown> } | undefined | null;
type StoredDoc = Record<string, unknown>;
type Capture = { written?: StoredDoc };
type CaptureStacks = Map<string, Capture[]>;

const keyOf = (collection: string, id: unknown): string => `${collection}:${String(id)}`;

const isStoredDoc = (value: unknown): value is StoredDoc =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const captureStacksOf = (req: ReqWithContext): CaptureStacks | undefined => {
  const stacks = req?.context?.[CTX_WRITTEN_DOCS];
  return stacks instanceof Map ? (stacks as CaptureStacks) : undefined;
};

export function openWrittenDocCapture(req: ReqWithContext, collection: string, id: unknown): void {
  if (!req) return;
  req.context ??= {};
  const stacks = captureStacksOf(req) ?? new Map<string, Capture[]>();
  const key = keyOf(collection, id);
  stacks.set(key, [...(stacks.get(key) ?? []), {}]);
  req.context[CTX_WRITTEN_DOCS] = stacks;
}

export function captureWrittenDoc(
  req: ReqWithContext,
  collection: string,
  id: unknown,
  written: unknown
): void {
  const capture = captureStacksOf(req)?.get(keyOf(collection, id))?.at(-1);
  if (!capture || capture.written || !isStoredDoc(written)) return;
  capture.written = structuredClone(written);
}

export function takeWrittenDoc(
  req: ReqWithContext,
  collection: string,
  id: unknown
): StoredDoc | undefined {
  const stacks = captureStacksOf(req);
  const key = keyOf(collection, id);
  const stack = stacks?.get(key);
  const capture = stack?.pop();
  if (stack?.length === 0) stacks?.delete(key);
  return capture?.written;
}
