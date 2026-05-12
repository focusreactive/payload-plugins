import type { Endpoint } from 'payload'

import { withErrorHandler, withAccessCheck } from '../../shared'
import type { AccessGuard } from '../../shared'
import type { TaskRunnerProvider } from '../../modules/task-runner'

import type { CancelConfig } from './model'
import { CancelByCollectionHandler } from './handler'

/**
 * Creates the cancel by collection endpoint
 */
export function createCancelByCollectionRoute(
  config: CancelConfig,
  taskRunnerFactory: TaskRunnerProvider,
  access?: AccessGuard,
  basePath = '/translate',
): Endpoint {
  const handler = new CancelByCollectionHandler(config, taskRunnerFactory)

  return {
    path: `${basePath}/cancel-by-collection/:collection_slug`,
    method: 'delete',
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access),
  }
}
