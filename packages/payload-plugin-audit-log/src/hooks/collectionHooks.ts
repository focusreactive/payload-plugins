import type {
  Block,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
  PayloadRequest,
} from "payload";
import { API_KEY_HIDDEN_FIELDS, AUTH_HIDDEN_FIELDS } from "../constants";
import { auditTarget, inLocale } from "../core/auditTarget";
import { createChangeDiff } from "../core/changeDiff";
import type { ChangeDiff } from "../core/changeDiff";
import { classifyCollectionChange } from "../core/classify";
import { usesApiKeys } from "../core/secretFields";
import { withStoredLocalizedValues } from "../core/storedLocalizedValues";
import type { OperationEventArgs } from "../core/writeEvent";
import { recordAuditEvent } from "../core/writeEvent";
import type { ResolvedOptions } from "../options";
import { failOpen } from "../utils/failOpen";
import { localizedFieldPaths, readRestrictedFieldPaths, storedValuesOf } from "../utils/fields";
import type { SanitizedFieldsShape } from "../utils/fields";
import { configuredLocalesOf, localeOfSave, readsWithFallbackLocale } from "../utils/locales";
import type { LocaleOfRequest } from "../utils/locales";
import { hasAutosave } from "../utils/versions";
import { buildCollectionAuthHooks } from "./collectionAuthHooks";
import { trackCollectionOperations } from "./collectionOperationTracking";

type Doc = Record<string, unknown>;

const fieldsHiddenByPayload = (auth: CollectionConfig["auth"]): string[] => {
  if (!auth) return [];
  return [...AUTH_HIDDEN_FIELDS, ...(usesApiKeys(auth) ? API_KEY_HIDDEN_FIELDS : [])];
};

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

  const record = (
    req: PayloadRequest,
    args: OperationEventArgs,
    savedIn: LocaleOfRequest = tracking.savedInOf(req)
  ) =>
    recordAuditEvent(req, opts, {
      ...args,
      target: localized ? inLocale(args.target, savedIn.locale) : args.target,
      localized,
    });

  const inLocaleOfSave = (savedIn: LocaleOfRequest, stored: Doc): Doc => {
    const locale = localeOfSave(savedIn, localized);
    return locale === undefined
      ? stored
      : withStoredLocalizedValues(stored, stored, localizedFields, locale);
  };

  const withoutFallbackValues = (
    savedIn: LocaleOfRequest,
    doc: Doc,
    written: Doc | undefined
  ): Doc => {
    const locale = localeOfSave(savedIn, localized);
    return written && locale !== undefined && readsWithFallbackLocale(savedIn)
      ? withStoredLocalizedValues(doc, written, localizedFields, locale)
      : doc;
  };

  const changesOfUpdate = (
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
    if (written) return diff.changedFields(lastPublish, doc, written);
    return diff.changedFields(lastPublish && inLocaleOfSave(savedIn, lastPublish), doc);
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
    const { flags, liveDoc, wasPublished, written } = tracking.finishSave(req, {
      operation,
      docId: doc.id,
      data,
    });
    if (flags.autosave) return;
    const savedIn = flags.savedIn ?? req;
    const diff = diffForSave({
      storedValuesOf: storedValuesOfConfig(sanitizedCollection as SanitizedFieldsShape),
      selected: flags.selected,
      submittedData: data,
      savedIn,
      configuredLocales: configuredLocalesOf(req),
      secretFields: flags.secretFields,
    });
    const savedDoc = diff.savedDoc(doc);
    const docAsStored = withoutFallbackValues(savedIn, doc, written);
    const publishes =
      operation === "update" &&
      !flags.restore &&
      savedDoc._status === "published" &&
      previousDoc?._status !== "published";
    const action = classifyCollectionChange({
      operation,
      previousDoc,
      doc: savedDoc,
      flags: { ...flags, wasPublished },
    });
    const comparesWithLiveDoc = action === "doc.unpublish" || (autosave && publishes);
    const changes =
      operation === "create"
        ? diff.createdFields(doc)
        : changesOfUpdate(savedIn, diff, {
            previousDoc,
            liveDocBeforeSave: comparesWithLiveDoc ? liveDoc : undefined,
            written,
            doc: docAsStored,
          });
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
