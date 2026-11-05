import type {
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeOperationHook,
  CollectionConfig,
  PayloadRequest,
} from "payload";
import { hasLeafValue } from "../core/diffPaths";
import { readForAudit } from "../core/failOpenInsert";
import type { OpFlags } from "../core/requestState";
import {
  ensureActive,
  getOpFlags,
  markActive,
  newCreateKey,
  operationFlagsOf,
  pushOpFlags,
  startedAfter,
  takeOpFlags,
  unmarkActive,
  withOperationFlags,
} from "../core/requestState";
import { submittedSecretFields } from "../core/secretFields";
import { openWrittenDocCapture, takeWrittenDoc } from "../core/writtenDocCapture";
import { failOpen } from "../utils/failOpen";
import { readsWithFallbackLocale } from "../utils/fallbackLocale";
import { hasLocalizedFields } from "../utils/fields";
import { hasAutosave, hasDrafts, isAutosaveDraftTick } from "../utils/versions";

type Doc = Record<string, unknown>;

type OperationArgs = {
  id?: unknown;
  data?: unknown;
  draft?: boolean;
  autosave?: boolean;
  duplicateFromID?: unknown;
  select?: unknown;
  publishSpecificLocale?: unknown;
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

type CreateTag = { flags: OpFlags; activeKey: string };
type TaggedData = { [CREATE_TAG]?: CreateTag };

const isPresent = (value: unknown): boolean => value !== undefined && value !== null;

const savesOneDocument = (operation: string, id: unknown): boolean =>
  operation === "create" || (operation === "update" && isPresent(id));

const isObject = (value: unknown): value is TaggedData =>
  typeof value === "object" && value !== null;

const startedByOperation = (flags: OpFlags): boolean => flags.source === "operation";

const isTracked = (flags: OpFlags): boolean => flags.source !== undefined;

const createTagOf = (data: unknown): CreateTag | undefined =>
  isObject(data) ? data[CREATE_TAG] : undefined;

function tagCreate(data: unknown, tag: CreateTag): void {
  if (isObject(data)) data[CREATE_TAG] = tag;
}

export function trackCollectionOperations(collection: CollectionConfig) {
  const slug = collection.slug;
  const isAuth = Boolean(collection.auth);
  const drafts = hasDrafts(collection.versions);
  const autosaveEnabled = hasAutosave(collection.versions);
  const localized = hasLocalizedFields(collection.fields);
  const comparesPublishWithLiveDoc = autosaveEnabled || (isAuth && drafts);

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

  const beginCreate = (req: PayloadRequest, data: unknown, flags: OpFlags) => {
    const activeKey = newCreateKey();
    markActive(req, slug, activeKey);
    tagCreate(data, { flags, activeKey });
  };

  const trackOperation = ({
    args,
    operation,
    req,
  }: Parameters<CollectionBeforeOperationHook>[0]) => {
    const runtimeOperation: string = operation;
    const { id, data, draft, autosave, duplicateFromID, select, publishSpecificLocale } =
      args as OperationArgs;
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

    const flags: OpFlags = {
      source: "operation",
      draft: Boolean(draft),
      restore: runtimeOperation === "restoreVersion",
      autosave:
        runtimeOperation !== "create" &&
        isAutosaveDraftTick(autosaveEnabled, { autosave, draft, data }),
      ...(select === undefined ? {} : { selected: true }),
      savedIn,
    };

    if (runtimeOperation === "create") {
      if (isPresent(duplicateFromID)) {
        flags.duplicate = true;
        flags.duplicateFrom = String(duplicateFromID);
      }
      beginCreate(req, data, flags);
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
    flags.liveDoc = mainDoc;
    if (mainDoc._status === "published") flags.wasPublished = true;
  };

  const rememberLiveDocBeforePublish = async (
    req: PayloadRequest,
    flags: OpFlags,
    docId: unknown
  ) => {
    if (!startedByOperation(flags) || flags.restore) return;
    const mainDoc = await readMainDoc(req, docId, "reading the live document failed");
    if (mainDoc) flags.liveDoc = mainDoc;
  };

  const moveRestoreFlagsToDocument = (req: PayloadRequest, id: string) => {
    const pendingRestore = getOpFlags(req, slug, PENDING_RESTORE_KEY);
    if (startedAfter(pendingRestore, operationFlagsOf(req, slug))) {
      pushOpFlags(req, slug, id, takeOpFlags(req, slug, PENDING_RESTORE_KEY));
    }
  };

  const savesRestore = (req: PayloadRequest, id: string): boolean =>
    startedAfter(getOpFlags(req, slug, id), operationFlagsOf(req, slug));

  const flagsOfSave = (req: PayloadRequest, id: string): OpFlags =>
    (savesRestore(req, id) ? getOpFlags(req, slug, id) : operationFlagsOf(req, slug)) ?? {};

  const captureWrittenDocOfSave = (
    req: PayloadRequest,
    flags: OpFlags,
    id: string,
    docId: unknown
  ) => {
    if (!isTracked(flags)) return;
    flags.writtenDocCaptures = new Set([...(flags.writtenDocCaptures ?? []), id]);
    openWrittenDocCapture(req, slug, docId);
  };

  const trackChange = async ({
    operation,
    originalDoc,
    req,
    data,
  }: Parameters<CollectionBeforeChangeHook>[0]) => {
    if (operation === "create") {
      const tag = createTagOf(data);
      if (tag) ensureActive(req, slug, tag.activeKey);
      else beginCreate(req, data, { duplicate: hasLeafValue(originalDoc) });
      return;
    }
    if (originalDoc?.id === undefined) return;
    const id = String(originalDoc.id);
    markActive(req, slug, id);
    if (req.context[PAYLOAD_RESTORING_VERSION_CONTEXT_KEY] === true) {
      moveRestoreFlagsToDocument(req, id);
    }
    const flags = flagsOfSave(req, id);

    const mayUnpublishBehindNewerDraft =
      drafts && data?._status === "draft" && originalDoc._status !== "published";
    if (mayUnpublishBehindNewerDraft) await rememberMainDocBehindDraft(req, flags, originalDoc.id);

    const publishesOverDraft =
      drafts && data?._status === "published" && originalDoc._status !== "published";
    if (publishesOverDraft && comparesPublishWithLiveDoc) {
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

  const beforeDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
    await failOpen(req.payload, TRACKING_FAILURE, () => markActive(req, slug, String(id)));
  };

  const afterDelete: CollectionAfterDeleteHook = async ({ id, req, doc }) => {
    await failOpen(req.payload, TRACKING_FAILURE, () => unmarkActive(req, slug, String(id)));
    return doc;
  };

  const takeFlags = (
    req: PayloadRequest,
    operation: "create" | "update",
    id: string,
    data: unknown
  ): OpFlags => {
    if (operation === "create") {
      const tag = createTagOf(data);
      if (tag) unmarkActive(req, slug, tag.activeKey);
      return tag?.flags ?? {};
    }
    unmarkActive(req, slug, id);
    return savesRestore(req, id) ? takeOpFlags(req, slug, id) : (operationFlagsOf(req, slug) ?? {});
  };

  const takeWrittenDocOfSave = (req: PayloadRequest, flags: OpFlags, docId: unknown) =>
    flags.writtenDocCaptures?.delete(String(docId)) ? takeWrittenDoc(req, slug, docId) : undefined;

  return {
    beforeOperation,
    beforeChange,
    beforeDelete,
    afterDelete,
    takeFlags,
    takeWrittenDocOfSave,
  };
}
