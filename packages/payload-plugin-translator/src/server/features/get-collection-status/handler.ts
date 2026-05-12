import type { PayloadRequest } from 'payload'

import { ServerResponse } from '../../shared'
import type { TaskRunnerProvider } from '../../modules/task-runner'
import { isCollectionAvailable } from '../_lib/collection-utils'

import { GetCollectionStatusInputSchema, type GetCollectionStatusConfig } from './model'

/**
 * Gets translation status for all documents in a collection
 */
export class GetCollectionStatusHandler {
  constructor(
    private readonly config: GetCollectionStatusConfig,
    private readonly taskRunnerFactory: TaskRunnerProvider,
  ) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = GetCollectionStatusInputSchema.safeParse(req.routeParams)
    if (validationResult.error) return ServerResponse.validationError(validationResult.error.errors)

    const collectionSlug = isCollectionAvailable(
      validationResult.data.collection_slug,
      this.config.availableCollections,
    )
    if (!collectionSlug) return ServerResponse.badRequest('Collection not available for translation')

    const runner = this.taskRunnerFactory.create(req.payload)
    const tasks = await runner.findByCollection(collectionSlug)

    return ServerResponse.success({
      docs: tasks.map((task) => ({
        id: task.id,
        status: task.status,
      })),
    })
  }
}
