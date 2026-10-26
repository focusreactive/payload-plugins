import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";
import { isCollectionAvailable } from "../_lib/collection-utils.js";
import { authorisedHandles } from "../../shared/access/authorised.js";

import { CancelByCollectionInputSchema } from "./model.js";
import type { CancelConfig } from "./model.js";

/**
 * Cancels every queued job for a collection; jobs in flight are left alone. Answers 204 whether or
 * not some were refused — unlike `/cancel`, which names them, because the caller here named no
 * handles to be told about.
 */
export class CancelByCollectionHandler {
  constructor(
    private readonly config: CancelConfig,
    private readonly taskRunnerFactory: TaskRunnerFactory
  ) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = CancelByCollectionInputSchema.safeParse(req.routeParams);
    if (validationResult.error)
      return ServerResponse.validationError(validationResult.error.issues);

    const collectionSlug = isCollectionAvailable(
      validationResult.data.collection_slug,
      this.config.availableCollections
    );
    if (!collectionSlug)
      return ServerResponse.badRequest("Collection not available for translation");

    const runner = this.taskRunnerFactory.create(req.payload);
    const rows = await runner.findByCollection(collectionSlug, { excludeCompleted: true });
    if (rows.length === 0) return ServerResponse.noContent();

    // A job is cancellable only while none of its locales is in flight, so this excludes rather
    // than selects: one running locale protects the whole job.
    const running = new Set(rows.filter((row) => row.status === "running").map((row) => row.id));
    const queued = new Map(
      rows
        .filter((row) => !running.has(row.id))
        .map((row) => [
          row.id,
          { handle: row.id, collectionSlug, collectionId: row.input.collectionId },
        ])
    );
    if (queued.size === 0) return ServerResponse.noContent();

    const { authorised } = await authorisedHandles({
      payload: req.payload,
      user: req.user,
      jobs: [...queued.values()],
    });
    if (authorised.length === 0) return ServerResponse.noContent();

    await runner.cancel(authorised);

    return ServerResponse.noContent();
  }
}
