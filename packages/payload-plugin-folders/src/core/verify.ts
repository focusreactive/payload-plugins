import { createPayloadRequest } from "payload";
import type { CreatePayloadRequestArgs, Payload, PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { ResolvedOptions } from "../types.js";
import { toFolderRecord } from "./folderRecords.js";
import { getDefaultLocaleKey, getFolderLocaleKeys, noLocaleKey } from "./locales.js";
import { getResolvedOptions } from "./runtime.js";
import { listIssues } from "./treeIssues.js";
import type { IssueCounts, TreeIssue } from "./treeIssues.js";
import { readTreeStateRowIds } from "./treeLock.js";
import { getPageDefaultLocale, getPageLocaleKeys } from "./uniqueness.js";
import { analyzeFolders } from "./verifyFolders.js";
import type { FolderAnalysis } from "./verifyFolders.js";
import { pageSegmentIssue, readPageFacts, segmentDrift } from "./verifyPages.js";
import type { PageFact, StaleVersion } from "./verifyPages.js";
import {
  duplicateClaimKey,
  findDuplicatePaths,
  findMultipleRootPages,
  groupSiblings,
  planSiblingKeys,
} from "./verifySiblings.js";
import type { KeyRewrite } from "./orderKeys.js";
import { readDanglingRedirects } from "./verifyRedirects.js";
import type { DanglingRedirect } from "./verifyRedirects.js";

/** Everything `repairTree` needs besides the issues, found by the same pass that finds them. */
export type TreeAnalysis = {
  /** Folder rows with their planned paths; every folder, trashed ones included. */
  folderAnalysis: FolderAnalysis;
  issues: TreeIssue[];
  keyRewrites: KeyRewrite[];
  /** Every live page's facts; empty for a quick pass. */
  pages: PageFact[];
  /** The pages whose segment or `pathSegment` repair rewrites. */
  pageWrites: Array<{ fact: PageFact; fixes: Record<string, string> }>;
  redirects: DanglingRedirect[];
  staleVersions: Array<StaleVersion & { collection: string }>;
};

/** Every folder row, every locale, no fallback, in one query. */
const readAllFolders = async (req: PayloadRequest, options: ResolvedOptions) => {
  const { docs } = await req.payload.db.find({
    collection: toCollectionSlug(options.folders.slug),
    locale: "all",
    pagination: false,
    req,
  });

  return (docs as Array<Record<string, unknown>>).map(toFolderRecord);
};

/**
 * One pass over the tree (spec section 5.9). `quick` reads the folder rows only, one query, and
 * checks what a folder's own row and its parent chain decide; the full pass adds every page of
 * every opted-in collection (read in batches), the latest versions, the redirect rows and the
 * tree-state rows. Nothing is written.
 */
export const analyzeTree = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  { quick }: { quick: boolean }
): Promise<TreeAnalysis> => {
  const { payload } = req;
  const keys = getFolderLocaleKeys(payload, options);
  const defaultKey = getDefaultLocaleKey(payload, options);
  const folderAnalysis = analyzeFolders({
    defaultKey,
    keys,
    options,
    records: await readAllFolders(req, options),
  });
  const issues: TreeIssue[] = [...folderAnalysis.issues];
  const analysis: TreeAnalysis = {
    folderAnalysis,
    issues,
    keyRewrites: [],
    pageWrites: [],
    pages: [],
    redirects: [],
    staleVersions: [],
  };
  if (quick) {
    return analysis;
  }

  const pageKeys = getPageLocaleKeys(payload);
  const defaultLocale = getPageDefaultLocale(payload);
  const facts: PageFact[] = [];
  for (const page of Object.values(options.collections)) {
    const read = await readPageFacts({ options, page, req });
    facts.push(...read.facts);
    for (const fact of read.facts) {
      const issue = pageSegmentIssue(page, fact);
      if (issue) {
        issues.push(issue);
      }
    }
    for (const stale of read.staleVersions) {
      analysis.staleVersions.push({ ...stale, collection: page.slug });
      issues.push({
        fields: stale.fields,
        fixable: true,
        item: { collection: page.slug, id: stale.id },
        kind: "staleVersion",
        message: `The latest version of ${page.slug} ${stale.id} holds a different ${stale.fields.join(", ")} than the page`,
      });
    }
  }
  analysis.pages = facts;

  const { claimedPages, issues: duplicateIssues } = findDuplicatePaths({
    defaultLocale,
    facts,
    folders: folderAnalysis.folders,
    foldersSlug: options.folders.slug,
    pageKeys,
  });
  issues.push(...duplicateIssues, ...findMultipleRootPages(facts));

  for (const fact of facts) {
    const isClaimed = pageKeys.some((key) =>
      claimedPages.has(duplicateClaimKey(fact.collection, fact.id, key))
    );
    const fixes: Record<string, string> = {};
    for (const { fixedSegment, key, segment } of fact.invalid) {
      const isFixable = fixedSegment !== null && !isClaimed;
      if (isFixable) {
        fixes[key] = fixedSegment;
      }
      issues.push({
        fixable: isFixable,
        fixedSegment: isFixable ? fixedSegment : null,
        item: { collection: fact.collection, id: fact.id },
        kind: "invalidSegment",
        locale: key === noLocaleKey ? null : key,
        message: isFixable
          ? `${fact.collection} ${fact.id} has the segment "${segment}", which is not a valid segment; repair saves "${fixedSegment}"`
          : `${fact.collection} ${fact.id} has the segment "${segment}", which is not a valid segment, and repair cannot choose another`,
        segment,
      });
    }
    if (segmentDrift(fact.ownSlug, fact.ownStored).length > 0 || Object.keys(fixes).length > 0) {
      analysis.pageWrites.push({ fact, fixes });
    }
  }

  for (const { parent, rows } of groupSiblings({
    facts,
    folders: folderAnalysis.folders,
    foldersSlug: options.folders.slug,
  }).values()) {
    const plan = planSiblingKeys(parent, rows);
    issues.push(...plan.issues);
    analysis.keyRewrites.push(...plan.rewrites);
  }

  const redirects = await readDanglingRedirects(req, options);
  analysis.redirects = redirects;
  for (const redirect of redirects) {
    issues.push({
      fixable: true,
      fromPath: redirect.fromPath,
      id: redirect.id,
      kind: "danglingRedirect",
      locale: redirect.locale,
      message: redirect.target
        ? `The redirect from ${redirect.fromPath} points at ${redirect.target.collection} ${redirect.target.id}, which no longer exists`
        : `The redirect from ${redirect.fromPath} points at nothing`,
      target: redirect.target,
    });
  }

  const treeStateIds = await readTreeStateRowIds(payload, req);
  if (treeStateIds.length > 1) {
    issues.push({
      fixable: false,
      ids: treeStateIds,
      kind: "treeStateRows",
      message: `The tree lock has ${treeStateIds.length} rows (${treeStateIds.join(", ")}) where it needs one; delete the extra rows by hand`,
    });
  }

  return analysis;
};

export type VerifyResult = {
  /** Per kind, how many issues there are. */
  counts: IssueCounts;
  /** Issues repair has no single answer for. */
  conflicts: number;
  /** Issues repair fixes. */
  fixable: number;
  /** At most 100 per kind; `counts` is complete. */
  issues: TreeIssue[];
  /** Nothing found. */
  ok: boolean;
  /** Folders only, one query. */
  quick: boolean;
  /** Whether `issues` leaves some out. */
  truncated: boolean;
};

export type VerifyTreeArgs = {
  /**
   * Check the folder rows only: one query, no page read. It finds the drift the tree view's banner
   * is about (a folder path, ancestry or depth that no longer follows the parent chain, a cycle, a
   * locale without a path row); the page, version, order key and redirect checks need the full pass.
   */
  quick?: boolean;
  /** The request to read on, so a caller's transaction carries over. Default: a new one. */
  req?: PayloadRequest;
  /** Who reads, for the request a new one is built with; ignored when `req` is given. */
  user?: CreatePayloadRequestArgs["user"];
};

/**
 * Spec section 5.9: lists what disagrees with the tree's rules, without writing and without the
 * tree lock. A write that commits while the pass runs can show as a drift that is not there; run it
 * again, or let `repairTree` decide, which reads everything again under the lock.
 */
export const verifyTree = async (
  payload: Payload,
  { quick = false, req: callerRequest, user }: VerifyTreeArgs = {}
): Promise<VerifyResult> => {
  const req = callerRequest ?? (await createPayloadRequest({ payload, req: {}, user }));
  const { issues } = await analyzeTree(req, getResolvedOptions(payload), { quick });
  const listed = listIssues(issues);
  const fixable = issues.filter((issue) => issue.fixable).length;

  return {
    conflicts: issues.length - fixable,
    counts: listed.counts,
    fixable,
    issues: listed.issues,
    ok: issues.length === 0,
    quick,
    truncated: listed.truncated,
  };
};
