import type { PayloadRequest } from "payload";

import { findUnreadableItems } from "../core/access.js";
import { readFolderRecord } from "../core/folderRecords.js";
import { itemKey } from "../core/itemKey.js";
import { readTitles } from "../core/issueTitles.js";
import { getDefaultLocaleKey, noLocaleKey } from "../core/locales.js";
import { summarizePageChanges } from "../core/move.js";
import type { MoveItemInput, MovePlan, MoveRequest } from "../core/move.js";
import { readPageRow } from "../core/pageRecords.js";
import type { FolderId, ItemRef, PathChange, ResolvedOptions } from "../types.js";
import { buildPlanDigest } from "./confirmationToken.js";
import { languageName } from "./locales.js";

export const examplesPerLocale = 3;

/** How many changes per language are checked for readability to find the examples. */
const exampleCandidatesPerLocale = 12;

export type UrlChange = { from: string; locale: string; to: string };

/** What a move does to published URLs, in the words and numbers the model and the user read. */
export type MoveChanges = {
  /** The same numbers, as the digest hashes them. */
  counts: Record<string, number>;
  digest: string;
  draftOnlyPages: number;
  needsConfirmation: boolean;
  publishedChanges: UrlChange[];
  publishedUrlChanges: { byLocale: Record<string, number>; total: number };
  redirects: { enabled: boolean; redirectsPluginRows: number; rowsToWrite: number };
  summary: string;
};

const pluralize = (count: number, singular: string, plural: string): string =>
  count === 1 ? singular : plural;

const toUrlChange = (change: PathChange): UrlChange | null =>
  change.from === null || change.to === null
    ? null
    : { from: change.from, locale: change.locale ?? noLocaleKey, to: change.to };

const joinWords = (words: string[]): string => {
  if (words.length <= 1) {
    return words.join("");
  }

  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
};

const urlSentence = ({
  byLocale,
  total,
}: {
  byLocale: Record<string, number>;
  total: number;
}): string => {
  if (total === 0) {
    return "No published URL will change.";
  }
  const localeKeys = Object.keys(byLocale);
  const count = `${total} published ${pluralize(total, "URL", "URLs")}`;
  if (localeKeys.length > 1) {
    return `${count} will change across ${localeKeys.length} languages.`;
  }
  if (localeKeys[0] !== noLocaleKey) {
    return `${count} will change in ${languageName(localeKeys[0])}.`;
  }

  return `${count} will change.`;
};

/**
 * The numbers and the one-line summary of a planned move, and the digest the confirmation token
 * binds. The same function reads the plan at preview time and again under the lock at apply time,
 * so both sides describe the change in the same words.
 */
export const describeMoveChanges = (plan: MovePlan): MoveChanges => {
  const allChanges = plan.items.flatMap((item) => item.changes);
  const { publishedChanges, urlChanges } = summarizePageChanges(allChanges);
  const published = publishedChanges
    .map(toUrlChange)
    .filter((change): change is UrlChange => change !== null);
  const byLocale: Record<string, number> = {};
  for (const change of published) {
    byLocale[change.locale] = (byLocale[change.locale] ?? 0) + 1;
  }
  const total = urlChanges.publishedAcrossLocales;
  const redirects = {
    enabled: plan.redirects,
    redirectsPluginRows: plan.preview.mirrorRowsToWrite,
    rowsToWrite: plan.preview.redirectRowsToWrite,
  };
  const counts = {
    draftOnly: urlChanges.draftOnly,
    published: urlChanges.published,
    publishedAcrossLocales: total,
    redirectsEnabled: plan.redirects ? 1 : 0,
    redirectsPluginRows: redirects.redirectsPluginRows,
    redirectRowsToWrite: redirects.rowsToWrite,
  };

  const isReorderOnly = plan.items.every((item) => !item.parentChanges);
  const sentences = [
    isReorderOnly
      ? "Only the order changes. No published URL will change."
      : urlSentence({ byLocale, total }),
  ];
  if (urlChanges.draftOnly > 0) {
    sentences.push(
      `${urlChanges.draftOnly} draft ${pluralize(urlChanges.draftOnly, "page", "pages")} will also move.`
    );
  }
  if (total > 0) {
    sentences.push(
      plan.redirects
        ? "The old URLs will redirect to the new ones."
        : "The old URLs will not redirect to the new ones."
    );
  }

  return {
    counts,
    digest: buildPlanDigest({ changes: published, counts }),
    draftOnlyPages: urlChanges.draftOnly,
    needsConfirmation: total > 0,
    publishedChanges: published,
    publishedUrlChanges: { byLocale, total },
    redirects,
    summary: sentences.join(" "),
  };
};

/**
 * Up to three published changes per language, in path order. The changes read at database level,
 * which checks no access, so a page the user may not read is left out: its path would tell them
 * it exists. The counts include it, as the admin's own preview does.
 */
export const pickExamples = async ({
  changes,
  req,
}: {
  changes: PathChange[];
  req: PayloadRequest;
}): Promise<UrlChange[]> => {
  const pageChanges = changes.filter(
    (change): change is PathChange & { from: string; to: string } =>
      change.kind === "page" && change.published && change.from !== null && change.to !== null
  );
  // Languages stay in the order the plan lists them, which is the site's; paths sort within one.
  const changesByLocale = new Map<string, Array<PathChange & { from: string; to: string }>>();
  for (const change of pageChanges) {
    const key = change.locale ?? noLocaleKey;
    changesByLocale.set(key, [...(changesByLocale.get(key) ?? []), change]);
  }
  const candidatesByLocale = new Map(
    [...changesByLocale].map(([key, localeChanges]) => [
      key,
      localeChanges
        .toSorted((left, right) => left.from.localeCompare(right.from))
        .slice(0, exampleCandidatesPerLocale),
    ])
  );

  const candidates = [...candidatesByLocale.values()].flat();
  const hidden = new Set(
    (
      await findUnreadableItems({
        items: candidates.map((change) => ({ collection: change.collection, id: change.id })),
        req,
      })
    ).map((item) => itemKey(item))
  );

  return [...candidatesByLocale.entries()].flatMap(([key, localeCandidates]) =>
    localeCandidates
      .filter((change) => !hidden.has(itemKey(change)))
      .slice(0, examplesPerLocale)
      .map((change) => ({ from: change.from, locale: key, to: change.to }))
  );
};

const itemsLabel = (titles: Map<string, string | null>, items: ItemRef[]): string => {
  const names = items.map((item) => titles.get(itemKey(item)) ?? `${item.collection} ${item.id}`);
  if (names.length <= 3) {
    return names.map((name) => `"${name}"`).join(", ");
  }

  return `${names.length} items`;
};

const exampleSentence = (examples: UrlChange[], isLocalized: boolean): string => {
  const parts = examples
    .slice(0, 3)
    .map(
      (example) =>
        `${example.from} becomes ${example.to}${isLocalized && example.locale !== noLocaleKey ? ` (${example.locale})` : ""}`
    );

  return parts.length === 0 ? "" : ` For example ${parts.join("; ")}.`;
};

/**
 * The questions an editor would be asked in the admin, worded with the numbers and example URLs, for
 * the model to put to the user. Nothing to ask when no published URL changes.
 */
export const buildMoveQuestions = async ({
  changes,
  examples,
  options,
  plan,
  req,
}: {
  changes: MoveChanges;
  examples: UrlChange[];
  options: ResolvedOptions;
  plan: MovePlan;
  req: PayloadRequest;
}): Promise<string[]> => {
  if (!changes.needsConfirmation) {
    return [];
  }
  const titles = await readTitles(
    req,
    options,
    plan.items.map((item) => item.ref)
  );
  const languages = Object.keys(changes.publishedUrlChanges.byLocale).filter(
    (key) => key !== noLocaleKey
  );
  const where =
    languages.length > 0 ? ` in ${joinWords(languages.map((key) => languageName(key)))}` : "";
  const defaultFolderPath = plan.target
    ? plan.target.fullPath[getDefaultLocaleKey(req.payload, options)] ||
      Object.values(plan.target.fullPath).find(Boolean)
    : undefined;
  const target = plan.target ? (defaultFolderPath ?? "the target folder") : "the top level";
  const { total } = changes.publishedUrlChanges;
  const lead = `Moving ${itemsLabel(
    titles,
    plan.items.map((item) => item.ref)
  )} into ${target} changes ${total} live ${pluralize(total, "URL", "URLs")}${where}.`;
  const questions = [`${lead}${exampleSentence(examples, languages.length > 0)} Go ahead?`];
  if (plan.redirects) {
    questions.push(
      "Redirect the old URLs to the new ones? (recommended) It is on in this preview. If the user says no, preview again with redirects set to false."
    );
  }

  return questions;
};

/**
 * The folder and order key each requested item has now, so the apply can refuse the move as stale if
 * an item moved in between. Read at database level: nothing here is shown to the caller, and the
 * plan that follows answers for an item the user may not read as it does for one that is missing.
 */
export const withExpectedState = async ({
  options,
  req,
  request,
}: {
  options: ResolvedOptions;
  req: PayloadRequest;
  request: MoveRequest;
}): Promise<MoveRequest> => {
  const readState = async (
    ref: ItemRef
  ): Promise<{ orderKey: string | null; parentId: FolderId | null } | null> => {
    if (ref.collection === options.folders.slug) {
      const record = await readFolderRecord(req, options, ref.id);

      return record ? { orderKey: record.orderKey, parentId: record.parent } : null;
    }
    const page = options.collections[ref.collection];
    const row = page ? await readPageRow(req, page, ref.id) : null;

    return row ? { orderKey: row.orderKey, parentId: row.folder } : null;
  };

  const items: MoveItemInput[] = [];
  for (const item of request.items) {
    const state = await readState(item);
    items.push(state && !item.expected ? { ...item, expected: state } : item);
  }
  if (request.after) {
    const anchor = await readState(request.after);
    const after =
      anchor && !request.after.expected
        ? { ...request.after, expected: { parentId: anchor.parentId } }
        : request.after;

    return { ...request, after, items } as MoveRequest;
  }

  return { ...request, items } as MoveRequest;
};
