import type { Payload } from "payload";
import { captureWrittenDoc } from "../core/writtenDocCapture";
import { failOpen } from "../utils/failOpen";
import { isId } from "../utils/isId";

type ReqOfWrite = { context?: Record<string, unknown> };

type UpdateOneArgs = {
  collection?: string;
  id?: unknown;
  where?: { id?: { equals?: unknown } };
  req?: ReqOfWrite;
};

type CreateVersionArgs = {
  collectionSlug?: string;
  parent?: unknown;
  req?: ReqOfWrite;
};

type Write<Args> = (this: unknown, args: Args) => Promise<unknown>;

const CAPTURING_MARKER = Symbol.for("payload-plugin-audit-log.collectionWritesCaptured");
const CAPTURE_FAILURE = "could not keep the document a save wrote";

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

export function captureCollectionWrites(payload: Payload, adapter: unknown): void {
  const db = adapter as Record<string | symbol, unknown> | undefined;
  if (!db || db[CAPTURING_MARKER]) return;
  db[CAPTURING_MARKER] = true;
  wrapWrite<UpdateOneArgs>(
    db,
    "updateOne",
    (args, result) => {
      const id = idOfUpdate(args);
      if (args?.collection && isId(id)) captureWrittenDoc(args.req, args.collection, id, result);
    },
    payload
  );
  wrapWrite<CreateVersionArgs>(
    db,
    "createVersion",
    (args, result) => {
      if (args?.collectionSlug && isId(args.parent)) {
        captureWrittenDoc(args.req, args.collectionSlug, args.parent, versionOf(result));
      }
    },
    payload
  );
}
