import type { Endpoint } from 'payload'

import { withErrorHandler, withAccessCheck } from '../../shared'
import type { AccessGuard } from '../../shared'
import type { TaskRunnerProvider } from '../../modules/task-runner'

import type { GetCollectionStatusConfig } from './model'
import { GetCollectionStatusHandler } from './handler'

/**
 * Creates the get collection status endpoint
 */
export function createGetCollectionStatusRoute(
  config: GetCollectionStatusConfig,
  taskRunnerFactory: TaskRunnerProvider,
  access?: AccessGuard,
  basePath = '/translate',
): Endpoint {
  const handler = new GetCollectionStatusHandler(config, taskRunnerFactory)

  return {
    path: `${basePath}/collection/:collection_slug`,
    method: 'get',
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access),
  }
}
