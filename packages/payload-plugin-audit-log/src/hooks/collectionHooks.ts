import type {
  Block,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
  PayloadRequest,
} from "payload";
import { API_KEY_HIDDEN_FIELDS, AUTH_HIDDEN_FIELDS } from "../constants";
import { auditTarget, inLocale } from "../core/auditTarget";
import { configuredLocalesOf, createChangeDiff } from "../core/changeDiff";
import type { ChangeDiff } from "../core/changeDiff";
import { classifyCollectionChange } from "../core/classify";
import { operationFlagsOf } from "../core/requestState";
import { usesApiKeys, withSecretFieldsFirst } from "../core/secretFields";
import { withStoredLocalizedValues } from "../core/storedLocalizedValues";
import type { OperationEventArgs } from "../core/writeEvent";
import { recordAuditEvent } from "../core/writeEvent";
import type { ResolvedOptions } from "../options";
import { failOpen } from "../utils/failOpen";
import { readsWithFallbackLocale } from "../utils/fallbackLocale";
import type { LocaleOfRequest } from "../utils/fallbackLocale";
import { localizedFieldPaths, readRestrictedFieldPaths, storedValuesOf } from "../utils/fields";
import type { SanitizedFieldsShape } from "../utils/fields";
import { hasAutosave } from "../utils/versions";
import { buildCollectionAuthHooks } from "./collectionAuthHooks";
import { trackCollectionOperations } from "./collectionOperationTracking";

type Doc = Record<string, unknown>;

const fieldsHiddenByPayload = (auth: CollectionConfig["auth"]): string[] => {
  if (!auth) return [];
  return [...AUTH_HIDDEN_FIELDS, ...(usesApiKeys(auth) ? API_KEY_HIDDEN_FIELDS : [])];
};

const ALL_LOCALES = "all";

const publishedOnly = (doc: Doc): Doc | undefined =>
  doc._status === "published" ? doc : undefined;

export function withCollectionAudit(
  collection: CollectionConfig,
  opts: ResolvedOptions,
  sharedBlocks: readonly Block[] = []
): CollectionConfig {
  const slug = collection.slug;
  const isAuth = Boolean(collection.auth);
  const autosave = hasAutosave(collection.versions);
  const localizedFields = localizedFieldPaths(collection.fields, sharedBlocks);
  const localized = localizedFields.length > 0;
  const titleField = collection.admin?.useAsTitle;
  const tracking = trackCollectionOperations(collection, localized);
  const storedValuesOfConfig = storedValuesOf(collection.fields);
  const diffForSave = createChangeDiff({
    readRestrictedFields: [
      ...readRestrictedFieldPaths(collection.fields, sharedBlocks),
      ...fieldsHiddenByPayload(collection.auth).map((name) => [name]),
    ],
    localizedFields,
    maxChangedPaths: opts.maxChangedPaths,
  });

  const titleOf = (doc: Doc | undefined): string | undefined => {
    const title = titleField ? doc?.[titleField] : undefined;
    return typeof title === "string" ? title : undefined;
  };

  const localeOfOperation = (req: PayloadRequest): LocaleOfRequest =>
    operationFlagsOf(req, slug)?.savedIn ?? req;

  const record = (
    req: PayloadRequest,
    args: OperationEventArgs,
    savedIn: LocaleOfRequest = localeOfOperation(req)
  ) =>
    recordAuditEvent(req, opts, {
      ...args,
      target: localized ? inLocale(args.target, savedIn.locale) : args.target,
      localized,
    });

  const localesOf = (req: PayloadRequest): readonly string[] =>
    localized ? configuredLocalesOf(req) : [];

  const localeOfSave = ({ locale }: LocaleOfRequest): string | undefined =>
    localized && typeof locale === "string" && locale !== ALL_LOCALES ? locale : undefined;

  const inLocaleOfSave = (savedIn: LocaleOfRequest, stored: Doc): Doc => {
    const locale = localeOfSave(savedIn);
    return locale === undefined
      ? stored
      : withStoredLocalizedValues(stored, stored, localizedFields, locale);
  };

  const withoutFallbackValues = (
    savedIn: LocaleOfRequest,
    doc: Doc,
    written: Doc | undefined
  ): Doc => {
    const locale = localeOfSave(savedIn);
    return written && locale !== undefined && readsWithFallbackLocale(savedIn)
      ? withStoredLocalizedValues(doc, written, localizedFields, locale)
      : doc;
  };

  const changesOfUpdate = (
    req: PayloadRequest,
    savedIn: LocaleOfRequest,
    diff: ChangeDiff,
    {
      previousDoc,
      liveDocBeforeSave,
      written,
      doc,
    }: { previousDoc: Doc; liveDocBeforeSave?: Doc; written?: Doc; doc: Doc }
  ): string[] => {
    if (!liveDocBeforeSave) return diff.changedFields(previousDoc, doc);
    const lastPublish = publishedOnly(liveDocBeforeSave);
    if (!written) {
      return diff.changedFields(lastPublish && inLocaleOfSave(savedIn, lastPublish), doc);
    }
    return diff.changedStoredFields(lastPublish, written, doc, localesOf(req));
  };

  const recordChange = async ({
    operation,
    previousDoc,
    doc,
    data,
    req,
    overrideAccess,
    collection: sanitizedCollection,
  }: Parameters<CollectionAfterChangeHook>[0]) => {
    const accessWasOverridden = overrideAccess === true;
    const flags = tracking.takeFlags(req, operation, String(doc.id), data);
    const written =
      operation === "update" ? tracking.takeWrittenDocOfSave(req, flags, doc.id) : undefined;
    if (flags.autosave) return;
    const savedIn = flags.savedIn ?? req;
    const diff = diffForSave({
      storedValuesOf: storedValuesOfConfig(sanitizedCollection as SanitizedFieldsShape),
      selected: flags.selected,
      submittedData: data,
      saveLocale: localeOfSave(savedIn),
    });
    const savedDoc = diff.savedDoc(doc);
    const docAsStored = withoutFallbackValues(savedIn, doc, written);
    const publishes =
      operation === "update" &&
      !flags.restore &&
      savedDoc._status === "published" &&
      previousDoc?._status !== "published";
    const action = classifyCollectionChange({ operation, previousDoc, doc: savedDoc, flags });
    const comparesWithLiveDoc = action === "doc.unpublish" || (autosave && publishes);
    const secretFields = operation === "update" ? (flags.secretFields ?? []) : [];
    const changes = withSecretFieldsFirst(
      secretFields,
      operation === "create"
        ? diff.createdFields(doc)
        : changesOfUpdate(req, savedIn, diff, {
            previousDoc,
            liveDocBeforeSave: comparesWithLiveDoc ? flags.liveDoc : undefined,
            written,
            doc: docAsStored,
          }),
      opts.maxChangedPaths
    );
    if (action === "doc.update" && changes.length === 0) return;

    await record(
      req,
      {
        action,
        target: auditTarget("collection", slug, doc.id, titleOf(doc)),
        changes,
        overrideAccess: accessWasOverridden,
        occurredAt: flags.startedAt,
      },
      savedIn
    );
  };

  const afterChange: CollectionAfterChangeHook = async (args) => {
    await failOpen(args.req.payload, "could not record the document change", () =>
      recordChange(args)
    );
    return args.doc;
  };

  const afterDelete: CollectionAfterDeleteHook = async ({ id, doc, req }) => {
    await failOpen(req.payload, "could not record the document deletion", () =>
      record(req, {
        action: "doc.delete",
        target: auditTarget("collection", slug, id, titleOf(doc)),
      })
    );
    return doc;
  };

  const hooks = collection.hooks ?? {};
  const authHooks = buildCollectionAuthHooks(slug, record);
  return {
    ...collection,
    hooks: {
      ...hooks,
      beforeOperation: [...(hooks.beforeOperation ?? []), tracking.beforeOperation],
      beforeChange: [...(hooks.beforeChange ?? []), tracking.beforeChange],
      afterChange: [...(hooks.afterChange ?? []), afterChange],
      afterDelete: [...(hooks.afterDelete ?? []), afterDelete],
      ...(isAuth
        ? {
            afterLogin: [...(hooks.afterLogin ?? []), authHooks.afterLogin],
            afterLogout: [...(hooks.afterLogout ?? []), authHooks.afterLogout],
            afterForgotPassword: [
              ...(hooks.afterForgotPassword ?? []),
              authHooks.afterForgotPassword,
            ],
          }
        : {}),
      afterOperation: [
        ...(hooks.afterOperation ?? []),
        ...(isAuth ? [authHooks.afterOperation] : []),
      ],
    },
  };
}
