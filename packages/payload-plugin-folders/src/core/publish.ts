import { APIError, createPayloadRequest } from "payload";
import type { CreatePayloadRequestArgs, Payload, PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ItemRef, ResolvedOptions } from "../types.js";
import { findRefusedChecks, keepReadableItems } from "./access.js";
import type { AccessCheck } from "./access.js";
import { getFallbackLocaleKey, getLocaleCodes, noLocaleKey } from "./locales.js";
import { createNestedRequest } from "./nestedRequest.js";
import { registerOperationHandler, runOrQueue } from "./operations.js";
import type { OperationHandler } from "./operations.js";
import { readSelection, readSelectionPages } from "./selection.js";
import { getResolvedOptions } from "./runtime.js";
import { readLatestStatuses, resolveTreeStatus } from "./status.js";

export type PublishAction = "publish" | "unpublish";

export type PublishRequest = {
  action: PublishAction;
  items: ItemRef[];
  /**
   * The locale to publish or unpublish in. Default: the default locale. A page keeps one status per
   * locale when its collection has drafts and localized fields.
   */
  locale?: string;
};

/** Pages left alone: `live` collections have no drafts, `unchanged` pages are already in the target state. */
export type PublishSkip = { collection: string; count: number; reason: "live" | "unchanged" };

type PublishUnit = { collection: string; id: FolderId };

export type PublishPlan = {
  /** Folders in the selection, subfolders included. */
  folders: number;
  /** Pages the action changes. */
  pages: number;
  skipped: PublishSkip[];
  units: PublishUnit[];
};

export type PublishResult =
  | { operationId: FolderId; skipped: PublishSkip[]; total: number }
  | { skipped: PublishSkip[]; updated: number };

export type PublishPreview = {
  /** True when the pages are many enough to run as a stepped operation. */
  isBatched: boolean;
} & Pick<PublishPlan, "folders" | "pages" | "skipped">;

/**
 * Refused without a title or a path: a refused user learns nothing about the content. `count` is
 * every refused page; `items` is the first 50 of the ones the user may read, which is all a client
 * needs to show.
 */
export class PublishRefusedError extends APIError {
  constructor({
    action,
    count,
    readable,
  }: {
    action: PublishAction;
    count: number;
    readable: ItemRef[];
  }) {
    super(
      `You are not allowed to ${action} ${count === 1 ? "one of these pages" : `${count} of these pages`}`,
      403,
      { count, items: readable.slice(0, 50), reason: "forbidden" },
      true
    );
    this.name = "PublishRefusedError";
  }
}

/** The slot a page's status is read in: the chosen locale, else the default locale, else none. */
const statusKeyOf = (payload: Payload, locale: string | undefined): string =>
  locale ?? (payload.config.localization ? payload.config.localization.defaultLocale : noLocaleKey);

/**
 * The pages of one drafts collection that `action` would change in `key`: the status is read from
 * the main row and the latest version, the way the tree shows it. Publishing leaves a published
 * page without a newer draft alone, unpublishing leaves a draft alone, so a repeat changes nothing.
 */
const findPagesToChange = async ({
  action,
  collection,
  ids,
  key,
  options,
  req,
}: {
  action: PublishAction;
  collection: string;
  ids: FolderId[];
  key: string;
  options: ResolvedOptions;
  req: PayloadRequest;
}): Promise<{ changing: FolderId[]; unchanged: number }> => {
  if (ids.length === 0) {
    return { changing: [], unchanged: 0 };
  }
  const pages = await readSelectionPages({ collection, options, req, where: { id: { in: ids } } });
  const latest = await readLatestStatuses({ collection, ids: pages.map((page) => page.id), req });
  const fallbackKey = getFallbackLocaleKey(req.payload);
  const changing: FolderId[] = [];
  for (const page of pages) {
    const status = resolveTreeStatus({
      fallbackKey,
      hasDrafts: true,
      key,
      latestStatus: latest.get(String(page.id)),
      mainStatus: page.row.status,
    });
    if (action === "publish" ? status !== "published" : status !== "draft") {
      changing.push(page.id);
    }
  }

  return { changing, unchanged: ids.length - changing.length };
};

const assertKnownItems = (options: ResolvedOptions, items: ItemRef[]): void => {
  for (const item of items) {
    if (item.collection !== options.folders.slug && !options.collections[item.collection]) {
      throw new APIError(
        `"${item.collection}" is not a folder or a page collection of the tree`,
        400,
        null,
        true
      );
    }
  }
};

const assertKnownLocale = (payload: Payload, locale: string | undefined): void => {
  const codes = getLocaleCodes(payload.config);
  if (locale !== undefined && (codes.length === 0 || !codes.includes(locale))) {
    throw new APIError(`"${locale}" is not a locale of this site`, 400, null, true);
  }
};

/**
 * What a publish or unpublish of `items` would do (spec sections 7.10 and 10.2): folders expand to
 * every page beneath them, pages in a collection without drafts are skipped and reported as live,
 * pages already in the target state are skipped and counted. Unless `overrideAccess` is true, the
 * user must pass `update` with `_status` for every page that changes (spec section 9), asked once
 * per collection; any refusal aborts the whole request with a `PublishRefusedError` naming no title.
 */
export const planPublish = async (
  req: PayloadRequest,
  request: PublishRequest,
  {
    options = getResolvedOptions(req.payload),
    overrideAccess = false,
  }: { options?: ResolvedOptions; overrideAccess?: boolean } = {}
): Promise<PublishPlan> => {
  const { payload } = req;
  assertKnownItems(options, request.items);
  assertKnownLocale(payload, request.locale);
  const key = statusKeyOf(payload, request.locale);
  const selection = await readSelection(req, options, request.items);

  const idsByCollection = new Map<string, FolderId[]>();
  for (const page of selection.pages) {
    idsByCollection.set(page.collection, [
      ...(idsByCollection.get(page.collection) ?? []),
      page.id,
    ]);
  }

  const skipped: PublishSkip[] = [];
  const units: PublishUnit[] = [];
  const checks: AccessCheck[] = [];
  for (const [collection, ids] of idsByCollection) {
    if (!payload.collections[toCollectionSlug(collection)]?.config.versions?.drafts) {
      skipped.push({ collection, count: ids.length, reason: "live" });
      continue;
    }
    const { changing, unchanged } = await findPagesToChange({
      action: request.action,
      collection,
      ids,
      key,
      options,
      req,
    });
    if (unchanged > 0) {
      skipped.push({ collection, count: unchanged, reason: "unchanged" });
    }
    if (changing.length === 0) {
      continue;
    }
    units.push(...changing.map((id) => ({ collection, id })));
    checks.push({
      collection,
      data: { _status: request.action === "publish" ? "published" : "draft" },
      group: { ids: changing, scope: { id: { in: changing } } },
      key: collection,
      operation: "update",
    });
  }

  if (!overrideAccess && checks.length > 0) {
    const refused = await findRefusedChecks({ checks, req });
    if (refused.size > 0) {
      const refusedUnits = units.filter((unit) => refused.has(unit.collection));
      throw new PublishRefusedError({
        action: request.action,
        count: refusedUnits.length,
        readable: await keepReadableItems({ items: refusedUnits, req }),
      });
    }
  }

  return { folders: selection.folders.length, pages: units.length, skipped, units };
};

/** The counts a dialog states before it asks: nothing is written and no access question is asked. */
export const previewPublish = async (
  req: PayloadRequest,
  request: PublishRequest,
  { options = getResolvedOptions(req.payload) }: { options?: ResolvedOptions } = {}
): Promise<PublishPreview> => {
  const plan = await planPublish(req, request, { options, overrideAccess: true });

  return {
    folders: plan.folders,
    isBatched: plan.units.length > options.limits.maxSyncDocuments,
    pages: plan.pages,
    skipped: plan.skipped,
  };
};

const toSkips = (plan: PublishSkip[], unchangedAtRun: Record<string, number>): PublishSkip[] => {
  const merged = new Map<string, PublishSkip>();
  for (const skip of plan) {
    merged.set(`${skip.collection}:${skip.reason}`, { ...skip });
  }
  for (const [collection, count] of Object.entries(unchangedAtRun)) {
    const existing = merged.get(`${collection}:unchanged`);
    merged.set(`${collection}:unchanged`, {
      collection,
      count: (existing?.count ?? 0) + count,
      reason: "unchanged",
    });
  }

  return [...merged.values()].filter((skip) => skip.count > 0);
};

/**
 * The step of a publish or unpublish: page by page, each one a normal Payload update, so the page's
 * own hooks run (uniqueness, root page, redirects) and a clash fails the step. This replaces the
 * ticket's one `update where id in` call: a bulk update that could change a URL is refused by
 * `bulkUpdateGuard`, because a bulk update commits other pages when one fails and checks pages that
 * are written at the same moment against each other's old state (G4). A page already in the target
 * state, or gone, is passed over, so a retried or repeated step changes nothing.
 */
const publishHandler = (action: PublishAction): OperationHandler => ({
  run: async ({ options, params, req, state }, units) => {
    const locale = typeof params.locale === "string" ? params.locale : undefined;
    const key = statusKeyOf(req.payload, locale);
    const idsByCollection = new Map<string, FolderId[]>();
    for (const unit of units as PublishUnit[]) {
      idsByCollection.set(unit.collection, [
        ...(idsByCollection.get(unit.collection) ?? []),
        unit.id,
      ]);
    }

    let updated = typeof state.updated === "number" ? state.updated : 0;
    const unchanged = (state.unchanged ?? {}) as Record<string, number>;
    for (const [collection, ids] of idsByCollection) {
      const { changing } = await findPagesToChange({ action, collection, ids, key, options, req });
      unchanged[collection] = (unchanged[collection] ?? 0) + (ids.length - changing.length);
      for (const id of changing) {
        await req.payload.update({
          collection: toCollectionSlug(collection),
          data: { _status: action === "publish" ? "published" : "draft" } as never,
          depth: 0,
          id,
          locale: locale as never,
          overrideAccess: params.overrideAccess === true,
          req: createNestedRequest(req),
          select: { id: true },
        });
        updated += 1;
      }
    }
    state.updated = updated;
    state.unchanged = unchanged;
  },
});

registerOperationHandler("publish", publishHandler("publish"));
registerOperationHandler("unpublish", publishHandler("unpublish"));

/**
 * Publishes or unpublishes the pages of `items`, folders expanded to everything beneath them (spec
 * sections 7.10 and 10.2). Up to `limits.maxSyncDocuments` pages run at once in one transaction
 * under the tree lock and answer `{ updated, skipped }`; above that an operation is stored and its
 * id answered for `POST /operations/:id/step`.
 */
export const applyPublish = async (
  req: PayloadRequest,
  request: PublishRequest,
  {
    options = getResolvedOptions(req.payload),
    overrideAccess = false,
  }: { options?: ResolvedOptions; overrideAccess?: boolean } = {}
): Promise<PublishResult> => {
  const plan = await planPublish(req, request, { options, overrideAccess });
  const outcome = await runOrQueue({
    kind: request.action,
    options,
    params: {
      ...(request.locale === undefined ? {} : { locale: request.locale }),
      overrideAccess,
    },
    req,
    units: plan.units,
  });
  if (outcome.queued) {
    return { operationId: outcome.operationId, skipped: plan.skipped, total: plan.units.length };
  }

  return {
    skipped: toSkips(plan.skipped, (outcome.state.unchanged ?? {}) as Record<string, number>),
    updated: typeof outcome.state.updated === "number" ? outcome.state.updated : 0,
  };
};

export type PublishItemsArgs = PublishRequest & {
  /** Like Payload's Local API: default false, so the user of `req` (or `user`) must pass `update`. */
  overrideAccess?: boolean;
  req?: PayloadRequest;
  user?: CreatePayloadRequestArgs["user"];
};

/** `applyPublish` for server code: builds a request for `user` when it is not given one. */
export const publishItems = async (
  payload: Payload,
  args: PublishItemsArgs
): Promise<PublishResult> => {
  const { overrideAccess, req: callerRequest, user, ...request } = args;
  const req = callerRequest ?? (await createPayloadRequest({ payload, req: {}, user }));

  return applyPublish(req, request, { overrideAccess });
};
