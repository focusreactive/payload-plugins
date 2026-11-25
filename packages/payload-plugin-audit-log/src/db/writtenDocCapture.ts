import type { Payload } from "payload";
import { failOpen } from "../utils/failOpen";
import { isId } from "../utils/isId";

type ReqWithContext = { context?: Record<string, unknown> } | undefined | null;
type StoredDoc = Record<string, unknown>;
type Capture = { written?: StoredDoc };
type CaptureStacks = Map<string, Capture[]>;

type UpdateOneArgs = {
  collection?: string;
  id?: unknown;
  where?: { id?: { equals?: unknown } };
  req?: ReqWithContext;
};

type CreateVersionArgs = {
  collectionSlug?: string;
  parent?: unknown;
  req?: ReqWithContext;
};

type Write<Args> = (this: unknown, args: Args) => Promise<unknown>;

const CTX_WRITTEN_DOCS = "__auditWrittenDocs";
const CAPTURING_MARKER = Symbol.for("payload-plugin-audit-log.collectionWritesCaptured");
const CAPTURE_FAILURE = "could not keep the document a save wrote";

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

function keepWrittenDoc(req: ReqWithContext, collection: string, id: unknown, written: unknown) {
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

const idOfUpdate = (args: UpdateOneArgs): unknown => args.id ?? args.where?.id?.equals;

const versionOf = (result: unknown): unknown =>
  typeof result === "object" && result !== null
    ? (result as { version?: unknown }).version
    : undefined;

function wrapWrite<Args>(
  db: Record<string | symbol, unknown>,
  method: string,
  keep: (args: Args, result: unknown) => void,
  payload: Payload
): void {
  const original = db[method];
  if (typeof original !== "function") return;
  db[method] = async function write(this: unknown, args: Args) {
    const result = await (original as Write<Args>).call(this ?? db, args);
    await failOpen(payload, CAPTURE_FAILURE, () => keep(args, result));
    return result;
  };
}

export function captureWrittenDocs(payload: Payload, adapter: unknown): void {
  const db = adapter as Record<string | symbol, unknown> | undefined;
  if (!db || db[CAPTURING_MARKER]) return;
  db[CAPTURING_MARKER] = true;
  wrapWrite<UpdateOneArgs>(
    db,
    "updateOne",
    (args, result) => {
      const id = idOfUpdate(args);
      if (args?.collection && isId(id)) keepWrittenDoc(args.req, args.collection, id, result);
    },
    payload
  );
  wrapWrite<CreateVersionArgs>(
    db,
    "createVersion",
    (args, result) => {
      if (args?.collectionSlug && isId(args.parent)) {
        keepWrittenDoc(args.req, args.collectionSlug, args.parent, versionOf(result));
      }
    },
    payload
  );
}
