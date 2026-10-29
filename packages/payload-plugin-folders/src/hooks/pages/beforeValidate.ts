import { ValidationError } from "payload";
import type { CollectionBeforeValidateHook } from "payload";

import { toCollectionSlug } from "../../collectionSlug.js";
import { normalizeFolderReference, readFolderRecord } from "../../core/folderRecords.js";
import type { FolderRecord } from "../../core/folderRecords.js";
import { noLocaleKey } from "../../core/locales.js";
import { popSnapshot, pushSnapshot, readPageRow, toSnapshot } from "../../core/pageRecords.js";
import type { PageRow } from "../../core/pageRecords.js";
import { SEGMENT_ERROR_MESSAGE, isValidSegment, slugify } from "../../core/slugify.js";
import {
  describeMissingSegment,
  describeRootPageConflict,
  describeSegmentConflict,
  findRootPageConflict,
  findSegmentConflict,
  folderPathIn,
  getPageDefaultLocale,
  getPageLocaleKeys,
  pageDepthIn,
  queryLocaleOf,
} from "../../core/uniqueness.js";
import type { FolderId, ResolvedOptions, ResolvedPageCollection } from "../../types.js";
import { isInternalWrite } from "../context.js";

type Problem = { locale?: string; message: string; path: string };
type SegmentsByLocale = Record<string, string | null>;

const isValuesByLocale = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === "";

const toSegment = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

/** A draft save writes the version only; a status per locale is a draft when no locale publishes. */
const isDraftStatus = (status: unknown): boolean =>
  status === "draft" ||
  (isValuesByLocale(status) &&
    Object.values(status).length > 0 &&
    Object.values(status).every((value) => value === "draft"));

const dedupe = (problems: Problem[]): Problem[] =>
  problems.filter(
    (problem, index) =>
      problems.findIndex(
        (other) => other.path === problem.path && other.message === problem.message
      ) === index
  );

/**
 * Spec sections 2.6, 2.7 and 4 for a page save: derives an empty slug from the title, then checks
 * the segment format, the reserved root segments, the three uniqueness rules in every locale, the
 * root-page rule, the depth cap and the folder's allowed types. It runs in `beforeValidate`, ahead
 * of Payload's required-field check on the slug, under the tree lock `beforeOperation` took.
 *
 * A draft save passes the conflict rules (build-lead decision 10): the warning is computed in the
 * edit view, and the rules bind on publish and on every save of a collection without drafts, against
 * the other pages' main rows. Format, reserved segments, depth and allowed types bind drafts too,
 * because a draft cannot repair them by waiting.
 *
 * Only what a save changes is checked: a create checks everything, an update checks the locales
 * whose effective segment differs from the main row, and un-setting the root flag checks the
 * segment as if it were new. A legacy segment saved before the plugin is accepted until edited.
 */
export const buildPageBeforeValidate =
  (page: ResolvedPageCollection, options: ResolvedOptions): CollectionBeforeValidateHook =>
  async ({ data, operation, originalDoc, req }) => {
    if (!data || isInternalWrite(req) || (operation !== "create" && operation !== "update")) {
      return data;
    }
    const { payload } = req;
    const isCreate = operation === "create";
    const segmentField = page.segmentField;
    const localization = payload.config.localization;
    const defaultLocale = getPageDefaultLocale(payload);
    const localeKeys = getPageLocaleKeys(payload);
    const requestLocale = typeof req.locale === "string" ? req.locale : undefined;
    const writesAllLocales = page.segmentLocalized && requestLocale === "all";
    const requestKey =
      localization && requestLocale && localization.localeCodes.includes(requestLocale)
        ? requestLocale
        : defaultLocale;

    // Payload fills the stored slug into an update, so an empty slug there is a locale that falls
    // back to the default locale (build-lead decision 19), not a request to derive one. Only the
    // default locale, which has nothing to fall back to, and a create derive from the title.
    if (writesAllLocales) {
      const titles = isValuesByLocale(data[page.titleField]) ? data[page.titleField] : {};
      const slugs: Record<string, unknown> = isValuesByLocale(data[segmentField])
        ? { ...data[segmentField] }
        : {};
      for (const [localeKey, title] of Object.entries(titles as Record<string, unknown>)) {
        if (
          isEmpty(slugs[localeKey]) &&
          !isEmpty(title) &&
          (isCreate || (localeKey === defaultLocale && slugs[localeKey] !== undefined))
        ) {
          slugs[localeKey] = slugify(String(title), localeKey);
        }
      }
      if (Object.keys(slugs).length > 0) {
        data[segmentField] = slugs as never;
      }
    } else if (
      isEmpty(data[segmentField]) &&
      (isCreate ||
        ((!page.segmentLocalized || requestKey === defaultLocale) &&
          data[segmentField] !== undefined))
    ) {
      const title = isEmpty(data[page.titleField])
        ? isCreate
          ? undefined
          : originalDoc?.[page.titleField]
        : data[page.titleField];
      const titleText = isValuesByLocale(title) ? title[defaultLocale] : title;
      const derived = slugify(typeof titleText === "string" ? titleText : "", requestLocale);
      if (derived !== "") {
        data[segmentField] = derived as never;
      }
    }

    const mainRow: PageRow | null = isCreate
      ? null
      : await readPageRow(req, page, originalDoc?.id as FolderId);
    if (!isCreate && !mainRow) {
      return data;
    }
    const pageId = originalDoc?.id as FolderId;
    // The post-write check in afterChange compares the saved row with this one.
    if (mainRow) {
      pushSnapshot(req, page.slug, pageId, toSnapshot(mainRow, localeKeys, defaultLocale));
    }

    let folderId: FolderId | null;
    if (isCreate) {
      const reference = normalizeFolderReference(data.folder);
      // The structure guard answers for a missing or malformed folder.
      if (reference.invalid) {
        return data;
      }
      folderId = reference.id;
    } else {
      folderId = mainRow?.folder ?? null;
    }
    const folder: FolderRecord | null =
      folderId === null ? null : await readFolderRecord(req, options, folderId);
    if (folderId !== null && !folder) {
      return data;
    }

    const problems: Problem[] = [];
    const isDraft =
      Boolean(payload.collections[toCollectionSlug(page.slug)]?.config.versions?.drafts) &&
      isDraftStatus(data._status);

    const draftRoot = originalDoc?.isFolderRoot;
    const mainIsRoot = Boolean(mainRow?.isFolderRoot && mainRow.isPublished);
    const proposedIsRoot =
      data.isFolderRoot !== undefined
        ? Boolean(data.isFolderRoot)
        : Boolean(draftRoot ?? mainRow?.isFolderRoot);
    const becameNonRoot = !isCreate && (mainIsRoot || Boolean(draftRoot)) && !proposedIsRoot;

    // Own segments by locale slot. Locales the write does not name keep what the main row has,
    // except the request locale, which takes the latest draft's value because that is what a
    // publish makes live.
    const toOwn = (value: unknown, fallbackKey: string): SegmentsByLocale =>
      isValuesByLocale(value)
        ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, toSegment(entry)]))
        : { [fallbackKey]: toSegment(value) };
    const storedOwn: SegmentsByLocale = {
      ...(mainRow ? toOwn(mainRow.segments, requestKey) : {}),
      ...(originalDoc && originalDoc[segmentField] !== undefined
        ? toOwn(originalDoc[segmentField], requestKey)
        : {}),
    };
    const proposedOwn: SegmentsByLocale = {
      ...storedOwn,
      ...(data[segmentField] !== undefined ? toOwn(data[segmentField], requestKey) : {}),
    };
    // What is live: nothing for a page that was only ever a draft, so publishing it checks everything.
    const mainOwn: SegmentsByLocale = mainRow?.isPublished
      ? toOwn(mainRow.segments, requestKey)
      : {};

    const effectiveIn = (own: SegmentsByLocale, key: string): string =>
      page.segmentLocalized
        ? (own[key] ?? own[defaultLocale] ?? "")
        : (own[noLocaleKey] ?? own[requestKey] ?? Object.values(own).find(Boolean) ?? "");
    const proposedEffective = Object.fromEntries(
      localeKeys.map((key) => [key, effectiveIn(proposedOwn, key)])
    );
    const mainEffective = Object.fromEntries(
      localeKeys.map((key) => [key, effectiveIn(mainOwn, key)])
    );
    const hasSegmentChanged = (key: string): boolean =>
      isCreate || becameNonRoot || proposedEffective[key] !== mainEffective[key];

    const invalidKeys = new Set<string>();
    if (!proposedIsRoot) {
      for (const key of localeKeys) {
        const segment = proposedEffective[key];
        const ownKey = page.segmentLocalized ? key : null;
        const ownValue = ownKey === null ? segment : proposedOwn[ownKey];
        const storedValue = ownKey === null ? effectiveIn(storedOwn, key) : storedOwn[ownKey];
        const isEdited = isCreate || becameNonRoot || ownValue !== storedValue;
        if (
          segment !== "" &&
          isEdited &&
          !isValidSegment(segment, { atSiteRoot: folderId === null })
        ) {
          invalidKeys.add(key);
          problems.push({
            locale: queryLocaleOf(key),
            message: SEGMENT_ERROR_MESSAGE,
            path: segmentField,
          });
        } else if (
          segment !== "" &&
          folderId === null &&
          hasSegmentChanged(key) &&
          options.reservedRootSegments.includes(segment)
        ) {
          invalidKeys.add(key);
          problems.push({
            locale: queryLocaleOf(key),
            message: `/${segment} is used by the site itself`,
            path: segmentField,
          });
        }
      }

      if (!isDraft && proposedEffective[defaultLocale] === "") {
        problems.push({ message: describeMissingSegment(defaultLocale), path: segmentField });
      }
    }

    if (!isDraft && !proposedIsRoot) {
      for (const key of localeKeys) {
        const segment = proposedEffective[key];
        if (segment === "" || invalidKeys.has(key) || !hasSegmentChanged(key)) {
          continue;
        }
        const conflict = await findSegmentConflict({
          folder,
          locale: key,
          options,
          publishedOnly: true,
          req,
          segment,
          self: isCreate ? null : { collection: page.slug, id: originalDoc?.id as FolderId },
        });
        if (conflict) {
          problems.push({
            locale: queryLocaleOf(key),
            message: describeSegmentConflict(conflict),
            path: segmentField,
          });
        }
      }
    }

    if (!isDraft && proposedIsRoot && (isCreate || !mainIsRoot)) {
      const conflict = await findRootPageConflict({
        folder,
        options,
        req,
        self: isCreate ? null : { collection: page.slug, id: originalDoc?.id as FolderId },
      });
      if (conflict) {
        const folderPath = folder ? folderPathIn(folder, requestKey, options, payload) : "/";
        problems.push({
          message: describeRootPageConflict(conflict, folderPath),
          path: "isFolderRoot",
        });
      }
    }

    if ((isCreate || becameNonRoot) && pageDepthIn(folder, proposedIsRoot) > options.maxDepth) {
      problems.push({
        message: `This would make URLs ${pageDepthIn(folder, proposedIsRoot)} segments deep; the limit is ${options.maxDepth}`,
        path: isCreate ? "folder" : "isFolderRoot",
      });
    }

    if (
      isCreate &&
      folder &&
      folder.allowedTypes.length > 0 &&
      !folder.allowedTypes.includes(page.slug)
    ) {
      problems.push({
        message: `This folder does not accept the type "${page.label}"`,
        path: "folder",
      });
    }

    if (problems.length > 0) {
      if (mainRow) {
        popSnapshot(req, page.slug, pageId);
      }
      throw new ValidationError({ collection: page.slug, errors: dedupe(problems), req });
    }

    return data;
  };
