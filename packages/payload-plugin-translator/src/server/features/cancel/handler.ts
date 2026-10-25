import type { CollectionSlug, PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import { refusedTargets } from "../../shared/access/refusedTargets.js";
import type { JobAssignment, TaskRunnerFactory } from "../../modules/task-runner/index.js";

import { CancelInputSchema } from "./model.js";

type Split = { allowed: string[]; refused: string[] };

/** Two collections can hold the same document id, so a verdict is keyed by both. */
const documentKey = (job: JobAssignment): string => `${job.collectionSlug}:${job.collectionId}`;

/** A run may name any collection, and the update rule is asked one collection at a time. */
async function splitByUpdateRule(
  payload: PayloadRequest["payload"],
  user: PayloadRequest["user"],
  jobs: JobAssignment[]
): Promise<Split> {
  const byCollection = new Map<CollectionSlug, string[]>();
  for (const job of jobs) {
    const documents = byCollection.get(job.collectionSlug) ?? [];
    documents.push(String(job.collectionId));
    byCollection.set(job.collectionSlug, documents);
  }

  const refusedDocuments = new Set<string>();
  for (const [collection, ids] of byCollection) {
    const refused = await refusedTargets({ payload, collection, ids, user });
    for (const id of refused) refusedDocuments.add(`${collection}:${id}`);
  }

  const split: Split = { allowed: [], refused: [] };
  for (const job of jobs) {
    const verdict = refusedDocuments.has(documentKey(job)) ? "refused" : "allowed";
    split[verdict].push(job.handle);
  }
  return split;
}

/**
 * Cancels and deletes translation tasks by IDs
 */
export class CancelHandler {
  constructor(private readonly taskRunnerFactory: TaskRunnerFactory) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = CancelInputSchema.safeParse(await req.json?.());
    if (validationResult.error) {
      return ServerResponse.validationError(validationResult.error.issues);
    }

    const { ids } = validationResult.data;
    const runner = this.taskRunnerFactory.create(req.payload);

    if (!runner.assignmentsOf) return ServerResponse.forbidden();

    const { allowed, refused } = await splitByUpdateRule(
      req.payload,
      req.user,
      await runner.assignmentsOf(ids)
    );

    await runner.cancel(allowed);

    if (refused.length === 0) return ServerResponse.noContent();
    return ServerResponse.success({ refused });
  }
}
