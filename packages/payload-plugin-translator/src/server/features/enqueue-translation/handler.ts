import type { PayloadRequest } from "payload";

import type { TaskRunnerProvider } from "../../modules/task-runner";
import { ServerResponse } from "../../shared";
import {
  isCollectionAvailable,
  getAllCollectionIds,
} from "../_lib/collection-utils";
import { EnqueueInputSchema } from './model';
import type { EnqueueConfig } from './model';

/**
 * Enqueues translation tasks for documents
 */
export class EnqueueTranslationHandler {
  constructor(
    private readonly config: EnqueueConfig,
    private readonly taskRunnerFactory: TaskRunnerProvider
  ) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = EnqueueInputSchema.safeParse(await req.json?.());
    if (validationResult.error)
      {return ServerResponse.validationError(validationResult.error.errors);}

    const {
      source_lng,
      target_lng,
      collection_slug,
      collection_id,
      select_all,
      strategy,
      publish_on_translation,
    } = validationResult.data;

    const collectionSlug = isCollectionAvailable(
      collection_slug,
      this.config.availableCollections
    );
    if (!collectionSlug)
      {return ServerResponse.badRequest(
        "Content of this collection is not available for translation"
      );}

    const collectionIds = select_all
      ? await getAllCollectionIds(req.payload, collectionSlug)
      : collection_id;

    const runner = this.taskRunnerFactory.create(req.payload);
    const tasks = collectionIds.map((id) => ({
      collectionId: id,
      collectionSlug,
      publishOnTranslation: publish_on_translation,
      sourceLng: source_lng,
      strategy: strategy,
      targetLng: target_lng,
    }));

    await runner.enqueue(tasks);

    return ServerResponse.success({ queued: tasks.length, success: true });
  }
}
