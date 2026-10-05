import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";
import { isCollectionAvailable, visibleIds } from "../_lib/collection-utils.js";

import {
  GetDocumentStatusInputSchema,
  latestTaskPerTargetLocale,
  taskToJobStatusOutput,
} from "./model.js";
import type { GetDocumentStatusConfig } from "./model.js";

/**
 * Gets the translation status for a specific document
 */
export class GetDocumentStatusHandler {
  constructor(
    private readonly config: GetDocumentStatusConfig,
    private readonly taskRunnerFactory: TaskRunnerFactory
  ) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = GetDocumentStatusInputSchema.safeParse(req.routeParams);
    if (validationResult.error) {
      return ServerResponse.validationError(validationResult.error.issues);
    }

    const { collection_slug, collection_id } = validationResult.data;

    const collectionSlug = isCollectionAvailable(collection_slug, this.config.availableCollections);
    if (!collectionSlug) {
      return ServerResponse.badRequest("Collection not available for translation");
    }

    const visible = await visibleIds(req.payload, collectionSlug, [collection_id], req.user);
    if (!visible.has(collection_id)) return ServerResponse.success([]);

    const runner = this.taskRunnerFactory.create(req.payload);
    const tasks = await runner.findByCollection(collectionSlug, { documentIds: [collection_id] });

    return ServerResponse.success(latestTaskPerTargetLocale(tasks).map(taskToJobStatusOutput));
  }
}
