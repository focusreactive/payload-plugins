import type { PayloadRequest } from "payload";

import type { TaskRunnerProvider } from "../../modules/task-runner";
import { ServerResponse } from "../../shared";
import { isCollectionAvailable } from "../_lib/collection-utils";
import { CancelByCollectionInputSchema } from './model';
import type { CancelConfig } from './model';

/**
 * Cancels all pending translation tasks for a collection
 */
export class CancelByCollectionHandler {
  constructor(
    private readonly config: CancelConfig,
    private readonly taskRunnerFactory: TaskRunnerProvider
  ) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = CancelByCollectionInputSchema.safeParse(
      req.routeParams
    );
    if (validationResult.error)
      {return ServerResponse.validationError(validationResult.error.errors);}

    const collectionSlug = isCollectionAvailable(
      validationResult.data.collection_slug,
      this.config.availableCollections
    );
    if (!collectionSlug)
      {return ServerResponse.badRequest(
        "Collection not available for translation"
      );}

    const runner = this.taskRunnerFactory.create(req.payload);
    const tasks = await runner.findByCollection(collectionSlug);
    if (tasks.length === 0) {return ServerResponse.noContent();}

    const pendingTaskIds = tasks
      .filter((task) => task.status === "pending")
      .map((task) => task.id);
    if (pendingTaskIds.length === 0) {return ServerResponse.noContent();}

    await runner.cancel(pendingTaskIds);

    return ServerResponse.noContent();
  }
}
