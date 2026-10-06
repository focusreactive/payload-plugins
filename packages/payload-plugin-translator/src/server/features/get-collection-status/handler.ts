import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";
import { isCollectionAvailable, visibleIds } from "../_lib/collection-utils.js";

import { GetCollectionStatusInputSchema, toCollectionStatusItem } from "./model.js";
import type { GetCollectionStatusConfig } from "./model.js";

/**
 * Gets translation status for all documents in a collection
 */
export class GetCollectionStatusHandler {
  constructor(
    private readonly config: GetCollectionStatusConfig,
    private readonly taskRunnerFactory: TaskRunnerFactory
  ) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = GetCollectionStatusInputSchema.safeParse(req.routeParams);
    if (validationResult.error) {
      return ServerResponse.validationError(validationResult.error.issues);
    }

    const collectionSlug = isCollectionAvailable(
      validationResult.data.collection_slug,
      this.config.availableCollections
    );

    if (!collectionSlug) {
      return ServerResponse.badRequest("Collection not available for translation");
    }

    const runner = this.taskRunnerFactory.create(req.payload);
    const tasks = await runner.findByCollection(collectionSlug);
    const ids = tasks.map((task) => String(task.input.collectionId));
    const visible = await visibleIds(req.payload, collectionSlug, ids, req.user);

    return ServerResponse.success({
      docs: tasks
        .filter((task) => visible.has(String(task.input.collectionId)))
        .map(toCollectionStatusItem),
    });
  }
}
