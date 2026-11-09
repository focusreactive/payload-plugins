import { randomUUID } from "node:crypto";
import { isolateObjectProperty } from "payload";
import { CTX_OP, CTX_REQUEST_ID } from "../constants";
import type { LocaleOfRequest } from "../utils/fallbackLocale";

type Context = Record<string, unknown>;
type ReqWithContext = { context?: Context } | undefined | null;

export type OpFlags = {
  source?: "operation" | "bulk";
  draft?: boolean;
  restore?: boolean;
  autosave?: boolean;
  wasPublished?: boolean;
  liveDoc?: Record<string, unknown>;
  secretFields?: string[];
  selected?: boolean;
  writtenDocCaptures?: Set<string>;
  capturesMainGlobal?: boolean;
  savedIn?: LocaleOfRequest;
  startedAt?: string;
};

type OpFlagStacks = Map<string, OpFlags[]>;

const contextOf = (req: ReqWithContext): Context | undefined => {
  if (!req) return undefined;
  req.context ??= {};
  return req.context;
};

function mapIn<V>(req: ReqWithContext, key: string): Map<string, V> | undefined {
  const context = contextOf(req);
  if (!context) return undefined;
  let map = context[key];
  if (!(map instanceof Map)) {
    map = new Map<string, V>();
    context[key] = map;
  }
  return map as Map<string, V>;
}

const existingMapIn = <V>(req: ReqWithContext, key: string): Map<string, V> | undefined => {
  const map = req?.context?.[key];
  return map instanceof Map ? (map as Map<string, V>) : undefined;
};

const opFlagsKey = (collection: string, key: string | number) => `${collection}:${key}`;

const startOrder = new WeakMap<OpFlags, number>();
let startedOperations = 0;

const rememberStartOrder = (flags: OpFlags): void => {
  if (startOrder.has(flags)) return;
  startedOperations += 1;
  startOrder.set(flags, startedOperations);
};

export function pushOpFlags(
  req: ReqWithContext,
  collection: string,
  key: string | number,
  flags: OpFlags
): void {
  const stacks = mapIn<OpFlags[]>(req, CTX_OP) as OpFlagStacks | undefined;
  if (!stacks) return;
  rememberStartOrder(flags);
  const stackKey = opFlagsKey(collection, key);
  const stack = stacks.get(stackKey) ?? [];
  stack.push(flags);
  stacks.set(stackKey, stack);
}

export function getOpFlags(
  req: ReqWithContext,
  collection: string,
  key: string | number
): OpFlags | undefined {
  return existingMapIn<OpFlags[]>(req, CTX_OP)?.get(opFlagsKey(collection, key))?.at(-1);
}

const OPERATION_FLAGS = Symbol.for("payload-plugin-audit-log.operationFlags");

type OperationFlags = { collection: string; flags: OpFlags };
type CarriesOperationFlags = { [OPERATION_FLAGS]?: OperationFlags };

export function withOperationFlags<R extends object>(
  req: R,
  collection: string,
  flags: OpFlags
): R {
  rememberStartOrder(flags);
  const operationReq = isolateObjectProperty(req, OPERATION_FLAGS as keyof R);
  (operationReq as CarriesOperationFlags)[OPERATION_FLAGS] = { collection, flags };
  return operationReq;
}

export function operationFlagsOf(req: ReqWithContext, collection: string): OpFlags | undefined {
  const carried = (req as CarriesOperationFlags | null | undefined)?.[OPERATION_FLAGS];
  return carried?.collection === collection ? carried.flags : undefined;
}

const startOrderOf = (flags: OpFlags | undefined): number =>
  flags ? (startOrder.get(flags) ?? 0) : -1;

export const startedAfter = (flags: OpFlags | undefined, other: OpFlags | undefined): boolean =>
  startOrderOf(flags) > startOrderOf(other);

export function takeOpFlags(
  req: ReqWithContext,
  collection: string,
  key: string | number
): OpFlags {
  const stacks = existingMapIn<OpFlags[]>(req, CTX_OP);
  const stackKey = opFlagsKey(collection, key);
  const stack = stacks?.get(stackKey);
  const flags = stack?.pop() ?? {};
  if (stacks && stack?.length === 0) stacks.delete(stackKey);
  return flags;
}

export function getRequestId(req: ReqWithContext): string {
  const context = contextOf(req);
  if (!context) return randomUUID();
  if (typeof context[CTX_REQUEST_ID] !== "string") context[CTX_REQUEST_ID] = randomUUID();
  return context[CTX_REQUEST_ID] as string;
}
