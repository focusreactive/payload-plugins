import { APIError } from "payload";
import type { PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { applyMove } from "../core/applyMove.js";
import { readFolderRecord } from "../core/folderRecords.js";
import { itemKey } from "../core/itemKey.js";
import { readTitles } from "../core/issueTitles.js";
import { noLocaleKey } from "../core/locales.js";
import { MoveBlockedError, summarizePageChanges } from "../core/move.js";
import type { MoveRequest } from "../core/move.js";
import { folderPathIn, getPageLocaleKeys, queryLocaleOf } from "../core/uniqueness.js";
import { parseMoveRequest } from "../endpoints/request.js";
import type { FolderId, ItemRef, ResolvedOptions } from "../types.js";
import { verifyConfirmationToken } from "./confirmationToken.js";
import type { ConfirmationTokenBody } from "./confirmationToken.js";
import { describeMoveChanges } from "./moveChanges.js";
import type { MoveChanges } from "./moveChanges.js";
import { stepQueuedOperation } from "./stepMirror.js";
import { runTool, toolRefusal, toolSuccess } from "./toolResult.js";
import type { FoldersMcpTool, FoldersMcpToolArguments, FoldersMcpToolResponse } from "./types.js";

const treeChangedMessage =
  "The tree changed since the preview. Preview again and confirm with the user.";

type PathsByLocale = Record<string, string | null>;

/**
 * Where each moved item is now, read after the write: a folder from its stored paths, a page from
 * its own `fullPath` in each language, read as the user. A page the user may not read has no path
 * in the answer rather than a guess.
 */
const readMovedPaths = async ({
  moved,
  options,
  req,
}: {
  moved: ItemRef[];
  options: ResolvedOptions;
  req: PayloadRequest;
}): Promise<Map<string, PathsByLocale>> => {
  const keys = getPageLocaleKeys(req.payload);
  const pathsByItem = new Map<string, PathsByLocale>();

  for (const item of moved.filter((ref) => ref.collection === options.folders.slug)) {
    const record = await readFolderRecord(req, options, item.id);
    pathsByItem.set(
      itemKey(item),
      Object.fromEntries(
        keys.map((key) => [key, record ? folderPathIn(record, key, options, req.payload) : null])
      )
    );
  }

  for (const collection of Object.keys(options.collections)) {
    const ids = moved.filter((ref) => ref.collection === collection).map((ref) => ref.id);
    if (ids.length === 0) {
      continue;
    }
    for (const key of keys) {
      const locale = queryLocaleOf(key);
      const { docs } = await req.payload.find({
        collection: toCollectionSlug(collection) as never,
        depth: 0,
        overrideAccess: false,
        pagination: false,
        req,
        where: { id: { in: ids } },
        ...(locale ? { locale: locale as never } : {}),
      });
      for (const ref of moved.filter((item) => item.collection === collection)) {
        const doc = (docs as unknown as Array<{ fullPath?: string | null; id: FolderId }>).find(
          (candidate) => String(candidate.id) === String(ref.id)
        );
        const paths = pathsByItem.get(itemKey(ref)) ?? {};
        paths[key] = doc?.fullPath ?? null;
        pathsByItem.set(itemKey(ref), paths);
      }
    }
  }

  return pathsByItem;
};

class RefusedBeforeWrite extends APIError {
  constructor(message: string) {
    super(message, 409, null, true);
    this.name = "RefusedBeforeWrite";
  }
}

const refuseUnlessConfirmed = ({
  body,
  confirmedSummary,
  fresh,
}: {
  body: ConfirmationTokenBody;
  confirmedSummary: unknown;
  fresh: MoveChanges;
}): void => {
  if (fresh.digest !== body.digest) {
    throw new RefusedBeforeWrite(`${treeChangedMessage} The change would now be: ${fresh.summary}`);
  }
  if (fresh.needsConfirmation && confirmedSummary !== fresh.summary) {
    throw new RefusedBeforeWrite(
      "confirmedSummary must be the summary previewMove returned for this change, word for word, after the user has seen it and agreed. Nothing was written."
    );
  }
};

const describeApplied = async ({
  fresh,
  mirror,
  moved,
  options,
  paths,
  published,
  req,
}: {
  fresh: MoveChanges;
  mirror: {
    done: number;
    operationId: FolderId;
    status: string;
    total: number;
    error?: string;
  } | null;
  moved: ItemRef[];
  options: ResolvedOptions;
  paths: Map<string, PathsByLocale>;
  published: { byLocale: Record<string, number>; total: number };
  req: PayloadRequest;
}): Promise<{
  text: string;
  movedItems: Array<{ collection: string; fullPath: PathsByLocale; id: FolderId }>;
}> => {
  const titles = await readTitles(req, options, moved);
  const movedItems = moved.map((item) => ({
    collection: item.collection,
    fullPath: paths.get(itemKey(item)) ?? {},
    id: item.id,
  }));
  const lines = movedItems.map((item) => {
    const title = titles.get(itemKey(item)) ?? `${item.collection} ${item.id}`;
    const where = Object.entries(item.fullPath)
      .map(([key, path]) => `${key === noLocaleKey ? "" : `${key} `}${path ?? "(not readable)"}`)
      .join(", ");

    return `- "${title}" is now at ${where}`;
  });
  const languages = Object.entries(published.byLocale)
    .map(([key, count]) => `${key} ${count}`)
    .join(", ");
  const text = [
    "Done.",
    ...lines,
    `Published URLs changed: ${published.total}${languages ? ` (${languages})` : ""}. Redirect rows written: ${fresh.redirects.rowsToWrite}.`,
    "Tell the user these new URLs, read back from the site after the change.",
  ];
  if (mirror && mirror.status !== "done") {
    text.push(
      `The redirects plugin's rows are still being written: operation ${mirror.operationId}, ${mirror.done} of ${mirror.total} done${mirror.error ? `, last error: ${mirror.error}` : ""}. The admin finishes it when it steps that operation.`
    );
  }

  return { movedItems, text: text.join("\n") };
};

const applyMoveChange = async ({
  body,
  confirmedSummary,
  options,
  req,
}: {
  body: ConfirmationTokenBody;
  confirmedSummary: unknown;
  options: ResolvedOptions;
  req: PayloadRequest;
}): Promise<FoldersMcpToolResponse> => {
  const request: MoveRequest = parseMoveRequest(req.payload, options, body.request);
  let fresh: MoveChanges | null = null;

  let result;
  try {
    result = await applyMove(req, request, {
      beforeWrite: (plan) => {
        fresh = describeMoveChanges(plan);
        refuseUnlessConfirmed({ body, confirmedSummary, fresh });
      },
      options,
      overrideAccess: false,
    });
  } catch (error) {
    if (
      error instanceof MoveBlockedError &&
      error.blocked.some(({ reason }) => reason === "stale")
    ) {
      return toolRefusal(treeChangedMessage);
    }
    throw error;
  }
  const applied = fresh as MoveChanges | null;
  if (!applied) {
    return toolRefusal("The move was applied, but its plan was not kept to report on.");
  }

  const mirror = result.mirrorOperationId
    ? await stepQueuedOperation({ operationId: result.mirrorOperationId, options, req })
    : null;
  const paths = await readMovedPaths({ moved: result.moved, options, req });
  const mirrorBatch = mirror
    ? {
        done: mirror.done,
        ...(mirror.error ? { error: mirror.error } : {}),
        operationId: result.mirrorOperationId as FolderId,
        status: mirror.status,
        total: mirror.total,
      }
    : null;
  const { urlChanges } = summarizePageChanges(result.changes);
  const byLocale: Record<string, number> = {};
  for (const change of result.changes.filter(
    (candidate) => candidate.kind === "page" && candidate.published
  )) {
    const key = change.locale ?? noLocaleKey;
    byLocale[key] = (byLocale[key] ?? 0) + 1;
  }
  const published = { byLocale, total: urlChanges.publishedAcrossLocales };
  const { movedItems, text } = await describeApplied({
    fresh: applied,
    mirror: mirrorBatch,
    moved: result.moved,
    options,
    paths,
    published,
    req,
  });

  return toolSuccess(text, {
    done: true,
    ...(mirrorBatch ? { mirrorBatch } : {}),
    moved: movedItems,
    publishedUrlChanges: published,
    redirects: {
      enabled: applied.redirects.enabled,
      redirectsPluginRows: applied.redirects.redirectsPluginRows,
      rowsWritten: applied.redirects.rowsToWrite,
    },
  });
};

const applyTreeChange = ({
  input,
  options,
  req,
}: FoldersMcpToolArguments & { options: ResolvedOptions }) =>
  runTool(async () => {
    if (!req.user) {
      return toolRefusal("Sign in to apply a change.");
    }
    if (typeof input.confirmationToken !== "string") {
      return toolRefusal(
        "confirmationToken is required: the token previewMove returned. Preview the change first."
      );
    }
    const verdict = verifyConfirmationToken({
      secret: req.payload.secret,
      token: input.confirmationToken,
      user: { collection: req.user.collection, id: req.user.id },
    });
    if (!verdict.ok) {
      return toolRefusal(verdict.message);
    }
    if (verdict.body.kind === "rename") {
      return toolRefusal(
        "Applying a rename is not available yet. Nothing was changed. Tell the user a rename has to be done in the admin for now."
      );
    }

    return applyMoveChange({
      body: verdict.body,
      confirmedSummary: input.confirmedSummary,
      options,
      req,
    });
  });

export const buildApplyTreeChangeTool = (options: ResolvedOptions): FoldersMcpTool => ({
  access: ({ req }) => Boolean(req.user),
  annotations: {
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
    readOnlyHint: false,
    title: "Apply a previewed change to the content tree",
  },
  description: `Applies a change that previewMove returned a confirmationToken for. It is the only tool that moves pages or folders, and it cannot run without a preview.

Before you call it, show the user the preview's summary and askUser questions and get their answer. When the preview said needsConfirmation is true, pass confirmedSummary: the preview's summary, word for word. When it said false (a reorder, or a move of draft pages only), the token alone is enough.

The tool plans the change again and compares it with the preview. If the tree changed in between, or the token was used already, it writes nothing and tells you to preview again. Preview again and ask the user again; do not reuse the old answer for a different change. It also refuses a token from another user and one older than 15 minutes.

On success it returns the new URL of every moved item in every language, read back after the write, the published URLs that changed, and the redirect rows written. Tell the user those URLs, not the ones you expected. If the redirects plugin's rows are still being written, the answer names the operation. You can only apply what your own account may do.`,
  handler: ({ input, req }) =>
    applyTreeChange({ input: input as Record<string, unknown>, options, req }),
  input: {
    additionalProperties: false,
    properties: {
      confirmationToken: {
        description: "The confirmationToken from previewMove, unchanged.",
        type: "string",
      },
      confirmedSummary: {
        description:
          "The preview's summary, word for word. Required when the preview's needsConfirmation was true.",
        type: "string",
      },
    },
    required: ["confirmationToken"],
    type: "object",
  },
});
