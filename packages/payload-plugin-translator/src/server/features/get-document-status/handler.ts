import type { PayloadRequest } from "payload";

import type { TaskRunnerProvider } from "../../modules/task-runner";
import { ServerResponse } from "../../shared";
import { isCollectionAvailable } from "../_lib/collection-utils";
import { GetDocumentStatusInputSchema, taskToJobStatusOutput } from './model';
import type { GetDocumentStatusConfig } from './model';

/**
 * Gets the translation status for a specific document
 */
export class GetDocumentStatusHandler {
  constructor(
    private readonly config: GetDocumentStatusConfig,
    private readonly taskRunnerFactory: TaskRunnerProvider
  ) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = GetDocumentStatusInputSchema.safeParse(
      req.routeParams
    );
    if (validationResult.error)
      {return ServerResponse.validationError(validationResult.error.errors);}

    const { collection_slug, collection_id } = validationResult.data;

    const collectionSlug = isCollectionAvailable(
      collection_slug,
      this.config.availableCollections
    );
    if (!collectionSlug)
      {return ServerResponse.badRequest(
        "Collection not available for translation"
      );}

    const runner = this.taskRunnerFactory.create(req.payload);
    const tasks = await runner.findByCollection(collectionSlug, [
      collection_id,
    ]);

    return ServerResponse.success(
      tasks[0] ? taskToJobStatusOutput(tasks[0]) : null
    );
  }
}
