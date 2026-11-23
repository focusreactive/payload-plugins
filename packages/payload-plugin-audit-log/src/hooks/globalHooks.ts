import type { Block, GlobalAfterChangeHook, GlobalConfig } from "payload";
import { auditTarget, inLocale } from "../core/auditTarget";
import { createChangeDiff, withStoredValuesOfFieldsMissingFrom } from "../core/changeDiff";
import { classifyGlobalChange } from "../core/classify";
import { withStoredLocalizedValues } from "../core/storedLocalizedValues";
import { recordAuditEvent } from "../core/writeEvent";
import type { CapturedMainGlobal } from "../db/mainGlobalCapture";
import type { ResolvedOptions } from "../options";
import { failOpen } from "../utils/failOpen";
import { localizedFieldPaths, readRestrictedFieldPaths, storedValuesOf } from "../utils/fields";
import type { SanitizedFieldsShape } from "../utils/fields";
import { configuredLocalesOf, localeOfSave, readsWithFallbackLocale } from "../utils/locales";
import type { LocaleOfRequest } from "../utils/locales";
import { hasAutosave, hasDrafts } from "../utils/versions";
import { trackGlobalOperations } from "./globalOperationTracking";

type Doc = Record<string, unknown>;

export function withGlobalAudit(
  global: GlobalConfig,
  opts: ResolvedOptions,
  sharedBlocks: readonly Block[] = []
): GlobalConfig {
  const slug = global.slug;
  const drafts = hasDrafts(global.versions);
  const autosave = hasAutosave(global.versions);
  const storedValuesOfConfig = storedValuesOf(global.fields);
  const localizedFields = localizedFieldPaths(global.fields, sharedBlocks);
  const localized = localizedFields.length > 0;
  const readRestrictedFields = readRestrictedFieldPaths(global.fields, sharedBlocks);
  const tracking = trackGlobalOperations(global);
  const diffForSave = createChangeDiff({
    readRestrictedFields,
    localizedFields,
    maxChangedPaths: opts.maxChangedPaths,
  });

  const storedBeforeSave = (mainGlobal: CapturedMainGlobal | undefined): Doc | null | undefined =>
    drafts ? (mainGlobal?.latestVersion ?? mainGlobal?.doc) : mainGlobal?.doc;

  const previousDocAsStored = (
    savedIn: LocaleOfRequest,
    previousDoc: Doc,
    mainGlobal: CapturedMainGlobal | undefined
  ): Doc => {
    const stored = storedBeforeSave(mainGlobal);
    if (!stored) return previousDoc;
    const locale = localeOfSave(savedIn, localized);
    if (locale === undefined) {
      return withStoredValuesOfFieldsMissingFrom(previousDoc, stored, readRestrictedFields);
    }
    const storedInLocale = withStoredLocalizedValues(stored, stored, localizedFields, locale);
    const shownWithoutFallback = readsWithFallbackLocale(savedIn)
      ? withStoredLocalizedValues(previousDoc, stored, localizedFields, locale)
      : previousDoc;
    return withStoredValuesOfFieldsMissingFrom(
      shownWithoutFallback,
      storedInLocale,
      readRestrictedFields
    );
  };

  const recordChange = async ({
    data,
    doc,
    previousDoc: previousDocAsRead,
    req,
    overrideAccess,
    global: sanitizedGlobal,
  }: Parameters<GlobalAfterChangeHook>[0]) => {
    const { flags, mainGlobal } = tracking.finishSave(req);
    if (flags.autosave) return;
    const savedIn = flags.savedIn ?? req;
    const previousDoc = previousDocAsStored(savedIn, previousDocAsRead, mainGlobal);
    const diff = diffForSave({
      storedValuesOf: storedValuesOfConfig(sanitizedGlobal as SanitizedFieldsShape),
      selected: flags.selected,
      submittedData: data,
      savedIn,
      configuredLocales: configuredLocalesOf(req),
    });
    const wasPublished = drafts && mainGlobal?.doc?._status === "published";
    const action = classifyGlobalChange(previousDoc, diff.savedDoc(doc), {
      ...flags,
      wasPublished,
    });
    const comparesWithMainGlobal =
      action === "global.unpublish" || (autosave && action === "global.publish" && !flags.restore);
    const changes =
      comparesWithMainGlobal && mainGlobal
        ? diff.changedFields(mainGlobal.doc ?? undefined, doc, mainGlobal.written ?? undefined)
        : diff.changedFields(previousDoc, doc);
    if (action === "global.update" && changes.length === 0) return;
    const target = auditTarget("global", slug);
    await recordAuditEvent(req, opts, {
      action,
      target: localized ? inLocale(target, savedIn.locale) : target,
      changes,
      overrideAccess: overrideAccess === true,
      localized,
      occurredAt: flags.startedAt,
    });
  };

  const afterChange: GlobalAfterChangeHook = async (args) => {
    await failOpen(args.req.payload, "could not record the global change", () =>
      recordChange(args)
    );
    return args.doc;
  };

  const hooks = global.hooks ?? {};
  return {
    ...global,
    hooks: {
      ...hooks,
      beforeOperation: [...(hooks.beforeOperation ?? []), tracking.beforeOperation],
      beforeChange: [...(hooks.beforeChange ?? []), tracking.beforeChange],
      afterChange: [...(hooks.afterChange ?? []), afterChange],
    },
  };
}
