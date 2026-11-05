import type { Block, Field, Payload, PayloadRequest } from "payload";
import {
  AUTH_HIDDEN_FIELDS,
  GLOBALS_NAMESPACE,
  IGNORED_DIFF_KEYS,
  MAX_WHERE_PATHS,
  TRUNCATED_MARKER,
} from "../constants";
import { auditTarget } from "../core/auditTarget";
import { withoutFieldsMissingFromAfter } from "../core/changeDiff";
import { readForAudit } from "../core/failOpenInsert";
import { storedInLocaleOfWrite } from "../core/storedLocalizedValues";
import { diffPaths, withoutEmptyValues } from "../core/diffPaths";
import {
  bindCoverageToTransaction,
  isActive,
  isInAuthOperation,
  takeActiveCreate,
} from "../core/requestState";
import { buildEvent, standaloneLocalReq, writeAuditEvent } from "../core/writeEvent";
import type { ResolvedOptions } from "../options";
import type { AuditEvent, AuditTarget } from "../types";
import { isId } from "../utils/isId";
import { failOpen } from "../utils/failOpen";
import { localizedFieldPaths, readRestrictedFieldPaths, storedFieldNames } from "../utils/fields";
import type { FieldPathPattern, FlattenedFieldShape } from "../utils/fields";
import { logError } from "../utils/logError";
import { whereFieldPaths } from "../utils/whereFieldPaths";

type Id = string | number;
type Where = Record<string, unknown>;
type Operation = "create" | "update" | "delete";

type DbArgs = {
  collection?: string;
  slug?: string;
  id?: Id;
  locale?: string;
  where?: Where;
  data?: Record<string, unknown>;
  options?: { upsert?: boolean };
  req?: Partial<PayloadRequest>;
};

type DbMethod = (this: unknown, args: DbArgs) => Promise<unknown>;
type StoredDoc = Record<string, unknown> | null | undefined;
type CollectionShape = {
  auth?: unknown;
  fields?: Field[];
  flattenedFields?: readonly FlattenedFieldShape[];
};

type FieldPathsOf = (fields: Field[] | undefined, sharedBlocks?: Block[]) => FieldPathPattern[];

type LocalizationShape = { localization?: false | { defaultLocale?: string } };

export type WrapDbScope = {
  collections: ReadonlySet<string>;
  globals: ReadonlySet<string>;
};

const WRAPPED_MARKER = Symbol.for("payload-plugin-audit-log.dbWrapped");

const AUTH_BOOKKEEPING_FIELDS: ReadonlySet<string> = new Set([
  ...AUTH_HIDDEN_FIELDS,
  "sessions",
  "_verified",
]);

const ALL_LOCALES = "all";

const INSPECTION_FAILURE = "could not inspect a raw database write";

const COLLECTION_WRITE_METHODS: ReadonlyArray<readonly [string, Operation]> = [
  ["create", "create"],
  ["updateOne", "update"],
  ["updateMany", "update"],
  ["upsert", "update"],
  ["deleteOne", "delete"],
  ["deleteMany", "delete"],
];

const GLOBAL_WRITE_METHODS = ["updateGlobal", "createGlobal"] as const;

const BULK_METHODS: ReadonlySet<string> = new Set(["updateMany", "deleteMany"]);

const idFromWhere = (where: Where | undefined): Id | undefined => {
  const equals = (where?.id as { equals?: unknown } | undefined)?.equals;
  return isId(equals) ? equals : undefined;
};

const isUpdateOneDelegatedFromUpsert = (method: string, args: DbArgs): boolean =>
  method === "updateOne" && args.options?.upsert === true;

const isRecordedKey = (key: string): boolean => !IGNORED_DIFF_KEYS.has(key);

const recordedKeys = (submittedKeys: readonly string[]): string[] =>
  submittedKeys.filter(isRecordedKey);

const truncated = (keys: string[], max: number): string[] =>
  keys.length > max ? [...keys.slice(0, max), TRUNCATED_MARKER] : keys;

const pick = (doc: StoredDoc, keys: readonly string[]): Record<string, unknown> =>
  Object.fromEntries(keys.map((key) => [key, doc?.[key]]));

const isAuthBookkeeping = (key: string): boolean => AUTH_BOOKKEEPING_FIELDS.has(key);

const writtenDocId = (method: string, args: DbArgs, result: unknown): string | undefined => {
  const resultId = BULK_METHODS.has(method) ? undefined : (result as { id?: unknown } | null)?.id;
  const id = args.id ?? idFromWhere(args.where) ?? (isId(resultId) ? resultId : undefined);
  return id === undefined ? undefined : String(id);
};

export function wrapDbAdapter(
  payload: Payload,
  opts: ResolvedOptions,
  scope: WrapDbScope,
  adapter: unknown
): void {
  if (!opts.trackUnattributedWrites) return;
  const db = adapter as Record<string | symbol, unknown>;
  if (!db || db[WRAPPED_MARKER]) return;
  db[WRAPPED_MARKER] = true;

  const tracksCollection = (slug: string | undefined): slug is string =>
    typeof slug === "string" && scope.collections.has(slug);

  const tracksGlobal = (slug: string | undefined): slug is string =>
    typeof slug === "string" && scope.globals.has(slug);

  const collectionConfig = (slug: string): CollectionShape | undefined =>
    (payload.collections as Record<string, { config?: CollectionShape }> | undefined)?.[slug]
      ?.config;

  const isAuthCollection = (slug: string): boolean => Boolean(collectionConfig(slug)?.auth);

  const storedFieldNamesOf = (slug: string): ReadonlySet<string> =>
    storedFieldNames(collectionConfig(slug)?.flattenedFields);

  const defaultLocale = (): string | undefined => {
    const localization = (payload.config as LocalizationShape | undefined)?.localization;
    return localization ? localization.defaultLocale : undefined;
  };

  const localeOfWrite = (args: DbArgs): string | undefined => {
    const requested = args.locale ?? args.req?.locale;
    return requested && requested !== ALL_LOCALES ? requested : defaultLocale();
  };

  const cachedFieldPathsOf = (fieldPathsOf: FieldPathsOf) => {
    const pathsBySlug = new Map<string, FieldPathPattern[]>();
    return (slug: string): FieldPathPattern[] => {
      const cached = pathsBySlug.get(slug);
      if (cached) return cached;
      const sharedBlocks = (payload.config as { blocks?: Block[] } | undefined)?.blocks;
      const paths = fieldPathsOf(collectionConfig(slug)?.fields, sharedBlocks);
      pathsBySlug.set(slug, paths);
      return paths;
    };
  };

  const readRestrictedPathsOf = cachedFieldPathsOf(readRestrictedFieldPaths);
  const localizedPathsOf = cachedFieldPathsOf(localizedFieldPaths);

  const readStored = (slug: string, args: DbArgs): Promise<StoredDoc> =>
    (db.findOne as (args: DbArgs) => Promise<StoredDoc>).call(db, {
      collection: slug,
      where: args.where ?? { id: { equals: args.id } },
      req: args.req,
    });

  const changesBeyondBookkeeping = async (
    slug: string,
    args: DbArgs,
    dataKeys: readonly string[]
  ): Promise<string[]> => {
    const read = await readForAudit(
      payload,
      args.req,
      async () => ({ stored: await readStored(slug, args) }),
      "could not read the stored document to compare a raw auth write"
    );
    if (!read) return truncated([...dataKeys], opts.maxChangedPaths);
    const written = pick(args.data, dataKeys);
    const storedInLocale = storedInLocaleOfWrite(
      pick(read.stored, dataKeys),
      written,
      localizedPathsOf(slug),
      localeOfWrite(args)
    );
    const readable = withoutFieldsMissingFromAfter(
      storedInLocale,
      written,
      readRestrictedPathsOf(slug)
    );
    return diffPaths(withoutEmptyValues(readable), withoutEmptyValues(written), {
      max: opts.maxChangedPaths,
    });
  };

  const authUserWriteChanges = async (
    method: string,
    args: DbArgs,
    submittedKeys: readonly string[]
  ): Promise<string[] | undefined> => {
    const slug = args?.collection;
    const writesOneUser = method === "updateOne" || method === "upsert";
    if (!writesOneUser || !tracksCollection(slug) || !isAuthCollection(slug)) return undefined;
    if (isUpdateOneDelegatedFromUpsert(method, args)) return undefined;
    if (isInAuthOperation(args.req, slug)) return [];
    const storedNames = storedFieldNamesOf(slug);
    const isStoredData = (key: string): boolean =>
      isRecordedKey(key) && storedNames.has(key) && !isAuthBookkeeping(key);
    if (!submittedKeys.some(isAuthBookkeeping)) {
      return submittedKeys.some(isStoredData) ? undefined : [];
    }
    const dataKeys = submittedKeys.filter(isStoredData);
    if (dataKeys.length === 0) return [];
    const docId = writtenDocId(method, args, undefined);
    if (isActive(args.req, slug, docId)) return undefined;
    return changesBeyondBookkeeping(slug, args, dataKeys);
  };

  const recordUnattributedWrite = async (
    method: string,
    args: DbArgs,
    target: AuditTarget,
    changes: string[] | undefined
  ) => {
    let event: AuditEvent;
    try {
      const where = whereFieldPaths(args.where).slice(0, MAX_WHERE_PATHS);
      event = buildEvent(args.req ?? standaloneLocalReq(), {
        action: "system.unattributed_write",
        target,
        localized: false,
        ...(changes ? { changes } : {}),
        metadata: where.length > 0 ? { method, where } : { method },
      });
    } catch (err) {
      logError(payload, "could not build the unattributed write event", err);
      return;
    }
    await writeAuditEvent(payload, opts.slug, event, args.req as PayloadRequest | undefined);
  };

  const submittedChanges = (submittedKeys: readonly string[]): string[] =>
    truncated(recordedKeys(submittedKeys), opts.maxChangedPaths);

  for (const [method, operation] of COLLECTION_WRITE_METHODS) {
    const original = db[method];
    if (typeof original !== "function") continue;
    const isCoveredByOperation = (
      req: DbArgs["req"],
      slug: string,
      docId: string | undefined
    ): boolean =>
      operation === "create" ? takeActiveCreate(req, slug) : isActive(req, slug, docId);

    const recordIfUnattributed = async (
      args: DbArgs,
      submittedKeys: readonly string[],
      authChanges: string[] | undefined,
      result: unknown
    ) => {
      const slug = args?.collection;
      if (!tracksCollection(slug)) return;
      if (isUpdateOneDelegatedFromUpsert(method, args)) return;
      if (authChanges?.length === 0) return;
      const docId = writtenDocId(method, args, result);
      if (isCoveredByOperation(args.req, slug, docId)) return;
      await recordUnattributedWrite(
        method,
        args,
        auditTarget("collection", slug, docId),
        operation === "delete" ? undefined : (authChanges ?? submittedChanges(submittedKeys))
      );
    };

    db[method] = async function wrapped(this: unknown, args: DbArgs) {
      bindCoverageToTransaction(args?.req);
      const submittedKeys = Object.keys(args?.data ?? {});
      let authChanges: string[] | undefined;
      let inspected = true;
      try {
        authChanges = await authUserWriteChanges(method, args, submittedKeys);
      } catch (err) {
        inspected = false;
        logError(payload, INSPECTION_FAILURE, err);
      }
      const result = await (original as DbMethod).call(this ?? db, args);
      if (inspected) {
        await failOpen(payload, INSPECTION_FAILURE, () =>
          recordIfUnattributed(args, submittedKeys, authChanges, result)
        );
      }
      return result;
    };
  }

  for (const method of GLOBAL_WRITE_METHODS) {
    const original = db[method];
    if (typeof original !== "function") continue;
    const recordIfUnattributed = async (args: DbArgs, submittedKeys: readonly string[]) => {
      const slug = args?.slug;
      if (!tracksGlobal(slug)) return;
      if (isActive(args.req, GLOBALS_NAMESPACE, slug)) return;
      await recordUnattributedWrite(
        method,
        args,
        auditTarget("global", slug),
        submittedChanges(submittedKeys)
      );
    };

    db[method] = async function wrapped(this: unknown, args: DbArgs) {
      const submittedKeys = Object.keys(args?.data ?? {});
      const result = await (original as DbMethod).call(this ?? db, args);
      await failOpen(payload, INSPECTION_FAILURE, () => recordIfUnattributed(args, submittedKeys));
      return result;
    };
  }
}
