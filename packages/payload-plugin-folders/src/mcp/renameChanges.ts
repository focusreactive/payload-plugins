import { badRequest } from "../core/badRequest.js";
import type { FolderEditPlan } from "../core/folderPreview.js";
import type { FolderRecord } from "../core/folderRecords.js";
import { noLocaleKey } from "../core/locales.js";
import type { FolderId } from "../types.js";
import { describeUrlChanges, joinWords, pluralize, urlSentence } from "./moveChanges.js";
import type { UrlChange } from "./moveChanges.js";
import { languageName } from "./locales.js";

type TextByLocale = Record<string, string>;

/**
 * A folder rename as the preview normalized it and the confirmation token carries it. `expected`
 * is what the folder held in the touched languages when the user was shown the change, so the apply
 * refuses it as stale when the folder was edited in between, and refuses a second use of a token
 * whose change is already in place.
 */
export type RenameRequest = {
  expected: { name: Record<string, string | null>; slug: Record<string, string | null> };
  folder: FolderId;
  name: TextByLocale;
  redirects: boolean;
  slug: TextByLocale;
};

const isTextMap = (value: unknown): value is TextByLocale =>
  typeof value === "object" &&
  value !== null &&
  Object.values(value).every((entry) => typeof entry === "string");

const isNullableTextMap = (value: unknown): value is Record<string, string | null> =>
  typeof value === "object" &&
  value !== null &&
  Object.values(value).every((entry) => entry === null || typeof entry === "string");

/** Reads a request back out of a token body. The token is signed, so this guards the shape only. */
export const readRenameRequest = (value: Record<string, unknown>): RenameRequest => {
  const expected = value.expected as Record<string, unknown> | undefined;
  if (
    (typeof value.folder !== "number" && typeof value.folder !== "string") ||
    !isTextMap(value.name) ||
    !isTextMap(value.slug) ||
    typeof value.redirects !== "boolean" ||
    !expected ||
    !isNullableTextMap(expected.name) ||
    !isNullableTextMap(expected.slug)
  ) {
    throw badRequest(
      "The confirmation token does not hold a rename this tool knows. Preview again and use the new token."
    );
  }

  return {
    expected: { name: expected.name, slug: expected.slug },
    folder: value.folder,
    name: value.name,
    redirects: value.redirects,
    slug: value.slug,
  };
};

/** What a rename does, in the words and numbers the model and the user read. */
export type RenameChanges = {
  counts: Record<string, number>;
  digest: string;
  draftOnlyPages: number;
  needsConfirmation: boolean;
  publishedChanges: UrlChange[];
  publishedUrlChanges: { byLocale: Record<string, number>; total: number };
  redirects: { enabled: boolean; redirectsPluginRows: number; rowsToWrite: number };
  summary: string;
};

const withLanguage = (key: string, what: string): string =>
  key === noLocaleKey ? `the ${what}` : `the ${languageName(key)} ${what}`;

const capitalize = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/**
 * The numbers, the one-line summary and the digest of a planned rename. The same function reads the
 * plan at preview time and again under the lock at apply time, so both sides use the same words and
 * the confirmation compares them.
 */
export const describeRenameChanges = ({
  keys,
  plan,
  request,
}: {
  keys: string[];
  plan: FolderEditPlan;
  request: RenameRequest;
}): RenameChanges => {
  const facts = describeUrlChanges({
    changes: plan.changes,
    redirects: {
      enabled: plan.redirects,
      redirectsPluginRows: plan.preview.mirrorRowsToWrite,
      rowsToWrite: plan.preview.redirectRowsToWrite,
    },
  });
  const { byLocale, total, urlChanges } = facts;

  const hasSlugChange = Object.keys(request.slug).length > 0;
  const clauses = [
    ...keys
      .filter((key) => key in request.name)
      .map((key) => `${withLanguage(key, "name")} becomes ${request.name[key]}`),
    ...keys
      .filter((key) => key in request.slug)
      .map((key) => `${withLanguage(key, "URL segment")} becomes ${request.slug[key]}`),
  ];
  const joinedClauses = joinWords(clauses);
  const sentences = [hasSlugChange ? `${capitalize(joinedClauses)}.` : `Only ${joinedClauses}.`];
  if (!hasSlugChange) {
    sentences.push("No URL changes.");
  } else {
    sentences.push(urlSentence({ byLocale, total }));
    if (urlChanges.draftOnly > 0) {
      sentences.push(
        `${urlChanges.draftOnly} draft ${pluralize(urlChanges.draftOnly, "page", "pages")} will also change URL.`
      );
    }
    if (total > 0) {
      sentences.push(
        plan.redirects
          ? "The old URLs will redirect to the new ones."
          : "The old URLs will not redirect to the new ones."
      );
    }
  }

  return {
    counts: facts.counts,
    digest: facts.digest,
    draftOnlyPages: urlChanges.draftOnly,
    needsConfirmation: total > 0,
    publishedChanges: facts.published,
    publishedUrlChanges: { byLocale, total },
    redirects: facts.redirects,
    summary: sentences.join(" "),
  };
};

/** The values of `record` in `keys`, for the part of a request a caller touches. */
export const pickStored = (
  values: FolderRecord["name"],
  keys: string[]
): Record<string, string | null> =>
  Object.fromEntries(keys.map((key) => [key, values[key] || null]));
