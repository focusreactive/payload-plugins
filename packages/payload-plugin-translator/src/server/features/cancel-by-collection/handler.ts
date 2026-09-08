import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared";
import type { TaskRunnerFactory } from "../../modules/task-runner";
import { isCollectionAvailable } from "../_lib/collection-utils";

import { CancelByCollectionInputSchema } from "./model";
import type { CancelConfig } from "./model";

/**
 * Cancels all pending translation tasks for a collection
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

    // Rows are per locale, cancel addresses jobs. Filtering rows by `pending` misses a job waiting
    // to retry: all of its locales are logged, so it has no pending row, yet the picker takes it
    // again.
    const running = new Set(rows.filter((row) => row.status === "running").map((row) => row.id));
    const queuedJobIds = [...new Set(rows.map((row) => row.id))].filter((id) => !running.has(id));
    if (queuedJobIds.length === 0) return ServerResponse.noContent();

    await runner.cancel(queuedJobIds);

    return ServerResponse.noContent();
  }
}
