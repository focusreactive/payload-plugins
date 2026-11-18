import type { CollectionSlug, PayloadRequest } from "payload";

import type { ID, RunHandle, TaskInput } from "../../modules/task-runner/types.js";

import { refusedTargets } from "./refusedTargets.js";

declare const workWasAskedAbout: unique symbol;
declare const handleWasAskedAbout: unique symbol;

/**
 * A `TaskInput` something asked about. A cast still forges one, so this catches a forgotten ask,
 * not a deliberate bypass.
 */
export type AuthorisedWork = TaskInput & { readonly [workWasAskedAbout]: true };

/** A `RunHandle` something asked about. */
export type AuthorisedHandle = RunHandle & { readonly [handleWasAskedAbout]: true };

const asWork = (tasks: readonly TaskInput[]): AuthorisedWork[] => tasks as AuthorisedWork[];
const asHandles = (handles: readonly RunHandle[]): AuthorisedHandle[] =>
  handles as AuthorisedHandle[];

type Split<Authorised, Refused> = { authorised: Authorised[]; refused: Refused[] };

type OnADocument = { collectionSlug: CollectionSlug; collectionId: string | number };

/** `distinct` is the point: several entries can name one document, so a verdict is asked for once. */
function distinctDocumentsByCollection(
  items: readonly OnADocument[]
): Map<CollectionSlug, string[]> {
  const grouped = new Map<CollectionSlug, Set<string>>();
  for (const item of items) {
    const ids = grouped.get(item.collectionSlug) ?? new Set<string>();
    ids.add(String(item.collectionId));
    grouped.set(item.collectionSlug, ids);
  }
  return new Map([...grouped].map(([collection, ids]) => [collection, [...ids]]));
}

async function refusedPerCollection(
  payload: PayloadRequest["payload"],
  user: PayloadRequest["user"],
  items: readonly OnADocument[]
): Promise<(item: OnADocument) => boolean> {
  const refused = new Map<CollectionSlug, Set<string>>();
  for (const [collection, ids] of distinctDocumentsByCollection(items)) {
    refused.set(collection, await refusedTargets({ payload, collection, ids, user }));
  }
  return (item) => refused.get(item.collectionSlug)?.has(String(item.collectionId)) ?? false;
}

/** Splits work by whether the caller may update each task's document; `refused` lists document ids, once each — `authorised` counts tasks. */
export async function authorisedWork(query: {
  payload: PayloadRequest["payload"];
  user: PayloadRequest["user"];
  tasks: readonly TaskInput[];
}): Promise<Split<AuthorisedWork, ID>> {
  const { payload, user, tasks } = query;
  const isRefused = await refusedPerCollection(payload, user, tasks);

  const refusedIds = new Set(tasks.filter(isRefused).map((task) => String(task.collectionId)));
  return {
    authorised: asWork(tasks.filter((task) => !isRefused(task))),
    refused: [...refusedIds],
  };
}

/** Splits runs by whether the caller may update each run's document. */
export async function authorisedHandles(query: {
  payload: PayloadRequest["payload"];
  user: PayloadRequest["user"];
  runs: readonly (OnADocument & { handle: RunHandle })[];
}): Promise<Split<AuthorisedHandle, RunHandle>> {
  const { payload, user, runs } = query;
  const isRefused = await refusedPerCollection(payload, user, runs);

  const authorised: RunHandle[] = [];
  const refused: RunHandle[] = [];
  for (const run of runs) {
    (isRefused(run) ? refused : authorised).push(run.handle);
  }
  return { authorised: asHandles(authorised), refused };
}

/**
 * Work the editor's own save produced, authorised by that save rather than by an ask. Asking here
 * would run a host callback inside the editor's `afterChange`, where a throw rolls their save back —
 * and it would only pre-empt a refusal the worker reaches anyway, before it spends.
 */
export function authorisedByTheSave(tasks: readonly TaskInput[]): AuthorisedWork[] {
  return asWork(tasks);
}

/**
 * Work over a whole collection, standing on the host's `read` rule instead of an ask: the caller
 * must have obtained these ids through a read that named the reader, which nothing here can check.
 * Asking the `update` rule would cost one evaluation per document in the collection.
 */
export function authorisedByTheReadFilter(tasks: readonly TaskInput[]): AuthorisedWork[] {
  return asWork(tasks);
}
