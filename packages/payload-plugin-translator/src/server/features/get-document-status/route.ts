import type { Endpoint } from 'payload'

import { withErrorHandler, withAccessCheck } from '../../shared'
import type { AccessGuard } from '../../shared'
import type { TaskRunnerProvider } from '../../modules/task-runner'

import type { GetDocumentStatusConfig } from './model'
import { GetDocumentStatusHandler } from './handler'

/**
 * Creates the get document status endpoint
 */
export function createGetDocumentStatusRoute(
  config: GetDocumentStatusConfig,
  taskRunnerFactory: TaskRunnerProvider,
  access?: AccessGuard,
  basePath = '/translate',
): Endpoint {
  const handler = new GetDocumentStatusHandler(config, taskRunnerFactory)

  return {
    path: `${basePath}/document/:collection_slug/:collection_id`,
    method: 'get',
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access),
  }
}
