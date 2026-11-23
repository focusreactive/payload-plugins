import type {
  CollectionBeforeChangeHook,
  CollectionBeforeOperationHook,
  CollectionConfig,
  PayloadRequest,
} from "payload";
import { readForAudit } from "../core/failOpenInsert";
import {
  getOpFlags,
  operationFlagsOf,
  pushOpFlags,
  startedAfter,
  takeOpFlags,
  withOperationFlags,
} from "../core/requestState";
import { flagsOfSave } from "../core/saveFlags";
import type { OpFlags, SaveArgs } from "../core/saveFlags";
import { submittedSecretFields } from "../core/secretFields";
import { openWrittenDocCapture, takeWrittenDoc } from "../db/writtenDocCapture";
import { failOpen } from "../utils/failOpen";
import { readsWithFallbackLocale } from "../utils/locales";
import type { LocaleOfRequest } from "../utils/locales";
import { hasAutosave, hasDrafts } from "../utils/versions";

type Doc = Record<string, unknown>;

type OperationArgs = SaveArgs & { id?: unknown; publishSpecificLocale?: unknown };

type SaveObservations = { liveDoc?: Doc; wasPublished?: boolean; writtenDocIds: Set<string> };

export type FinishedCollectionSave = {
  flags: OpFlags;
  liveDoc?: Doc;
  wasPublished?: boolean;
  written?: Doc;
};

const TRACKING_FAILURE = "could not track the document operation";
const PENDING_RESTORE_KEY = "restoreVersion";
const PAYLOAD_RESTORING_VERSION_CONTEXT_KEY = "isRestoringVersion";
const TRACKED_OPERATIONS: ReadonlySet<string> = new Set(["create", "update", "restoreVersion"]);
const OPERATIONS_RECORDED_IN_THEIR_LOCALE: ReadonlySet<string> = new Set([
  "delete",
  "login",
  "forgotPassword",
  "resetPassword",
]);

const CREATE_TAG = Symbol.for("payload-plugin-audit-log.create");

type TaggedData = { [CREATE_TAG]?: OpFlags };

const isPresent = (value: unknown): boolean => value !== undefined && value !== null;

const savesOneDocument = (operation: string, id: unknown): boolean =>
  operation === "create" || (operation === "update" && isPresent(id));

const isObject = (value: unknown): value is TaggedData =>
  typeof value === "object" && value !== null;

const startedByOperation = (flags: OpFlags): boolean => flags.source === "operation";

const isTracked = (flags: OpFlags): boolean => flags.source !== undefined;

const createFlagsOf = (data: unknown): OpFlags | undefined =>
  isObject(data) ? data[CREATE_TAG] : undefined;

function tagCreate(data: unknown, flags: OpFlags): void {
  if (isObject(data)) data[CREATE_TAG] = flags;
}

export function trackCollectionOperations(collection: CollectionConfig, localized: boolean) {
  const slug = collection.slug;
  const isAuth = Boolean(collection.auth);
  const drafts = hasDrafts(collection.versions);
  const autosaveEnabled = hasAutosave(collection.versions);
  const observationsOfSaves = new WeakMap<OpFlags, SaveObservations>();

  const observationsOf = (flags: OpFlags): SaveObservations => {
    const observations = observationsOfSaves.get(flags) ?? { writtenDocIds: new Set<string>() };
    observationsOfSaves.set(flags, observations);
    return observations;
  };

  const secretFieldsOf = (data: unknown, draft: unknown): string[] => {
    if (!isAuth || !isObject(data)) return [];
    const submitted = data as Doc;
    const savingDraft = drafts && Boolean(draft) && submitted._status !== "published";
    return submittedSecretFields(collection.auth, submitted, savingDraft);
  };

  const withSecretFields = (flags: OpFlags, data: unknown, draft: unknown): OpFlags => {
    const secretFields = secretFieldsOf(data, draft);
    return secretFields.length > 0 ? { ...flags, secretFields } : flags;
  };

  const trackOperation = ({
    args,
    operation,
    req,
  }: Parameters<CollectionBeforeOperationHook>[0]) => {
    const runtimeOperation: string = operation;
    const operationArgs = args as OperationArgs;
    const { id, data, draft, publishSpecificLocale } = operationArgs;
    const operationReq: PayloadRequest = args.req ?? req;
    const savedIn = {
      locale:
        publishSpecificLocale && savesOneDocument(runtimeOperation, id)
          ? publishSpecificLocale
          : operationReq.locale,
      fallbackLocale: operationReq.fallbackLocale,
    };
    if (OPERATIONS_RECORDED_IN_THEIR_LOCALE.has(runtimeOperation)) {
      return { ...args, req: withOperationFlags(operationReq, slug, { savedIn }) };
    }
    if (!TRACKED_OPERATIONS.has(runtimeOperation)) return undefined;

    const flags = flagsOfSave(runtimeOperation, operationArgs, autosaveEnabled, savedIn);

    if (runtimeOperation === "create") {
      tagCreate(data, flags);
      return undefined;
    }
    if (runtimeOperation === "restoreVersion") {
      pushOpFlags(req, slug, PENDING_RESTORE_KEY, flags);
      return undefined;
    }
    const savedFlags = isPresent(id) ? flags : { ...flags, source: "bulk" as const };
    return {
      ...args,
      req: withOperationFlags(operationReq, slug, withSecretFields(savedFlags, data, draft)),
    };
  };

  const readMainDoc = (req: PayloadRequest, docId: unknown, failure: string) =>
    readForAudit(
      req.payload,
      req,
      () =>
        req.payload.db.findOne<Doc & { id: string | number }>({
          collection: slug,
          where: { id: { equals: docId } },
          req,
        }),
      failure
    );

  const rememberMainDocBehindDraft = async (
    req: PayloadRequest,
    flags: OpFlags,
    docId: unknown
  ) => {
    const isPlainSave =
      startedByOperation(flags) && !flags.draft && !flags.autosave && !flags.restore;
    if (!isPlainSave) return;
    const mainDoc = await readMainDoc(req, docId, "reading the published document failed");
    if (!mainDoc) return;
    const observations = observationsOf(flags);
    observations.liveDoc = mainDoc;
    if (mainDoc._status === "published") observations.wasPublished = true;
  };

  const rememberLiveDocBeforePublish = async (
    req: PayloadRequest,
    flags: OpFlags,
    docId: unknown
  ) => {
    if (!startedByOperation(flags) || flags.restore) return;
    const mainDoc = await readMainDoc(req, docId, "reading the live document failed");
    if (mainDoc) observationsOf(flags).liveDoc = mainDoc;
  };

  const moveRestoreFlagsToDocument = (req: PayloadRequest, id: string) => {
    const pendingRestore = getOpFlags(req, slug, PENDING_RESTORE_KEY);
    if (startedAfter(pendingRestore, operationFlagsOf(req, slug))) {
      pushOpFlags(req, slug, id, takeOpFlags(req, slug, PENDING_RESTORE_KEY));
    }
  };

  const savesRestore = (req: PayloadRequest, id: string): boolean =>
    startedAfter(getOpFlags(req, slug, id), operationFlagsOf(req, slug));

  const flagsOfDocumentSave = (
    req: PayloadRequest,
    id: string,
    flagsOfRestore: typeof getOpFlags
  ): OpFlags =>
    (savesRestore(req, id) ? flagsOfRestore(req, slug, id) : operationFlagsOf(req, slug)) ?? {};

  const captureWrittenDocOfSave = (
    req: PayloadRequest,
    flags: OpFlags,
    id: string,
    docId: unknown
  ) => {
    if (!isTracked(flags)) return;
    observationsOf(flags).writtenDocIds.add(id);
    openWrittenDocCapture(req, slug, docId);
  };

  const trackChange = async ({
    operation,
    originalDoc,
    req,
    data,
  }: Parameters<CollectionBeforeChangeHook>[0]) => {
    if (operation === "create" || originalDoc?.id === undefined) return;
    const id = String(originalDoc.id);
    if (req.context[PAYLOAD_RESTORING_VERSION_CONTEXT_KEY] === true) {
      moveRestoreFlagsToDocument(req, id);
    }
    const flags = flagsOfDocumentSave(req, id, getOpFlags);

    const mayUnpublishBehindNewerDraft =
      drafts && data?._status === "draft" && originalDoc._status !== "published";
    if (mayUnpublishBehindNewerDraft) await rememberMainDocBehindDraft(req, flags, originalDoc.id);

    const publishesOverDraft =
      drafts && data?._status === "published" && originalDoc._status !== "published";
    if (publishesOverDraft && autosaveEnabled) {
      await rememberLiveDocBeforePublish(req, flags, originalDoc.id);
    }

    const showsFallbackValues = localized && readsWithFallbackLocale(flags.savedIn ?? req);
    if (showsFallbackValues || (publishesOverDraft && autosaveEnabled)) {
      captureWrittenDocOfSave(req, flags, id, originalDoc.id);
    }
  };

  const beforeOperation: CollectionBeforeOperationHook = async (args) =>
    (await failOpen(args.req.payload, TRACKING_FAILURE, () => trackOperation(args))) ?? args.args;

  const beforeChange: CollectionBeforeChangeHook = async (args) => {
    await failOpen(args.req.payload, TRACKING_FAILURE, () => trackChange(args));
    return args.data;
  };

  const finishSave = (
    req: PayloadRequest,
    { operation, docId, data }: { operation: "create" | "update"; docId: unknown; data: unknown }
  ): FinishedCollectionSave => {
    if (operation === "create") return { flags: createFlagsOf(data) ?? {} };
    const id = String(docId);
    const flags = flagsOfDocumentSave(req, id, takeOpFlags);
    const observations = observationsOfSaves.get(flags);
    const written = observations?.writtenDocIds.delete(id)
      ? takeWrittenDoc(req, slug, docId)
      : undefined;
    return {
      flags,
      liveDoc: observations?.liveDoc,
      wasPublished: observations?.wasPublished,
      written,
    };
  };

  const savedInOf = (req: PayloadRequest): LocaleOfRequest =>
    operationFlagsOf(req, slug)?.savedIn ?? req;

  return { beforeOperation, beforeChange, finishSave, savedInOf };
}
