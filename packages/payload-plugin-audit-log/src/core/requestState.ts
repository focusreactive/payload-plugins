import { randomUUID } from "node:crypto";
import { isolateObjectProperty } from "payload";
import { CTX_ACTIVE, CTX_AUTH_OPERATIONS, CTX_OP, CTX_REQUEST_ID } from "../constants";

type Context = Record<string, unknown>;
type AdapterWithSessions = { sessions?: Record<string, unknown> };
type RequestLike = {
  context?: Context;
  transactionID?: unknown;
  payload?: unknown;
};
type ReqWithContext = RequestLike | undefined | null;

export type OpFlags = {
  source?: "operation" | "bulk";
  draft?: boolean;
  duplicate?: boolean;
  duplicateFrom?: string;
  restore?: boolean;
  autosave?: boolean;
  wasPublished?: boolean;
  liveDoc?: Record<string, unknown>;
  secretFields?: string[];
  selected?: boolean;
  writtenDocCaptures?: Set<string>;
  capturesMainGlobal?: boolean;
};

type Counts = Map<string, number>;
type OpFlagStacks = Map<string, OpFlags[]>;

const COVERAGE_KEYS = [CTX_ACTIVE, CTX_OP, CTX_AUTH_OPERATIONS] as const;

const COVERAGE_BY_SESSION = Symbol.for("payload-plugin-audit-log.coverageBySession");

type CoverageRegistry = WeakMap<object, Set<RequestLike>>;

type GlobalWithRegistry = typeof globalThis & { [COVERAGE_BY_SESSION]?: CoverageRegistry };

function coverageRegistry(): CoverageRegistry {
  const shared = globalThis as GlobalWithRegistry;
  shared[COVERAGE_BY_SESSION] ??= new WeakMap();
  return shared[COVERAGE_BY_SESSION];
}

const isSession = (value: unknown): value is object => typeof value === "object" && value !== null;

const contextOf = (req: ReqWithContext): Context | undefined => {
  if (!req) return undefined;
  req.context ??= {};
  return req.context;
};

const isEmptyCollection = (value: unknown): boolean => !(value instanceof Map) || value.size === 0;

const hasCoverage = (context: Context | undefined): boolean =>
  Boolean(context) && COVERAGE_KEYS.some((key) => !isEmptyCollection(context?.[key]));

const isStartedTransaction = (transactionID: unknown): boolean =>
  transactionID !== undefined && transactionID !== null && !(transactionID instanceof Promise);

const liveSessionOf = (req: RequestLike, transactionID: unknown): unknown =>
  (req.payload as { db?: AdapterWithSessions } | undefined)?.db?.sessions?.[String(transactionID)];

function registerCoverage(req: RequestLike): void {
  const { transactionID } = req;
  if (!isStartedTransaction(transactionID)) return;
  const session = liveSessionOf(req, transactionID);
  if (!isSession(session)) return;
  const registry = coverageRegistry();
  const requests = registry.get(session) ?? new Set<RequestLike>();
  requests.add(req);
  registry.set(session, requests);
}

export function bindCoverageToTransaction(req: ReqWithContext): void {
  if (req && hasCoverage(req.context)) registerCoverage(req);
}

function mapIn<V>(req: ReqWithContext, key: string): Map<string, V> | undefined {
  const context = contextOf(req);
  if (!(context && req)) return undefined;
  let map = context[key];
  if (!(map instanceof Map)) {
    map = new Map<string, V>();
    context[key] = map;
  }
  registerCoverage(req);
  return map as Map<string, V>;
}

const existingMapIn = <V>(req: ReqWithContext, key: string): Map<string, V> | undefined => {
  const map = req?.context?.[key];
  return map instanceof Map ? (map as Map<string, V>) : undefined;
};

const increment = (counts: Counts, key: string): void => {
  counts.set(key, (counts.get(key) ?? 0) + 1);
};

const decrement = (counts: Counts, key: string): void => {
  const remaining = (counts.get(key) ?? 0) - 1;
  if (remaining > 0) counts.set(key, remaining);
  else counts.delete(key);
};

const opFlagsKey = (collection: string, key: string | number) => `${collection}:${key}`;

const CREATE_KEY_PREFIX = "create:";

const isCreateKey = (key: string): boolean => key.startsWith(CREATE_KEY_PREFIX);

export const newCreateKey = (): string => `${CREATE_KEY_PREFIX}${randomUUID()}`;

export function markActive(req: ReqWithContext, collection: string, key: string): void {
  const active = mapIn<Counts>(req, CTX_ACTIVE);
  if (!active) return;
  const counts = active.get(collection) ?? new Map<string, number>();
  increment(counts, key);
  active.set(collection, counts);
}

export function ensureActive(req: ReqWithContext, collection: string, key: string): void {
  const counts = existingMapIn<Counts>(req, CTX_ACTIVE)?.get(collection);
  if (!counts?.has(key)) markActive(req, collection, key);
}

export function unmarkActive(req: ReqWithContext, collection: string, key: string): void {
  const active = existingMapIn<Counts>(req, CTX_ACTIVE);
  const counts = active?.get(collection);
  if (!(active && counts)) return;
  decrement(counts, key);
  if (counts.size === 0) active.delete(collection);
}

export function takeActiveCreate(req: ReqWithContext, collection: string): boolean {
  const counts = existingMapIn<Counts>(req, CTX_ACTIVE)?.get(collection);
  const newestCreate = [...(counts?.keys() ?? [])].filter(isCreateKey).at(-1);
  if (newestCreate === undefined) return false;
  unmarkActive(req, collection, newestCreate);
  return true;
}

export function isActive(req: ReqWithContext, collection: string, id: string | undefined): boolean {
  if (id === undefined) return false;
  return existingMapIn<Counts>(req, CTX_ACTIVE)?.get(collection)?.has(id) ?? false;
}

export function markAuthOperation(req: ReqWithContext, collection: string): void {
  const operations = mapIn<number>(req, CTX_AUTH_OPERATIONS);
  if (operations) increment(operations, collection);
}

export function endAuthOperation(req: ReqWithContext, collection: string): void {
  const operations = existingMapIn<number>(req, CTX_AUTH_OPERATIONS);
  if (!operations) return;
  decrement(operations, collection);
}

export function isInAuthOperation(req: ReqWithContext, collection: string): boolean {
  return existingMapIn<number>(req, CTX_AUTH_OPERATIONS)?.has(collection) ?? false;
}

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

function releaseCoverage(req: RequestLike): void {
  const context = req.context;
  if (!context) return;
  for (const key of COVERAGE_KEYS) context[key] = undefined;
}

export function releaseCoverageOfSession(session: unknown): void {
  if (!isSession(session)) return;
  const registry = coverageRegistry();
  const requests = registry.get(session);
  registry.delete(session);
  for (const req of requests ?? []) releaseCoverage(req);
}

export function forgetCoverageOfSession(session: unknown): void {
  if (isSession(session)) coverageRegistry().delete(session);
}

export function getRequestId(req: ReqWithContext): string {
  const context = contextOf(req);
  if (!context) return randomUUID();
  if (typeof context[CTX_REQUEST_ID] !== "string") context[CTX_REQUEST_ID] = randomUUID();
  return context[CTX_REQUEST_ID] as string;
}
