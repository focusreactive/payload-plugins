import type { Endpoint } from 'payload'

import { withErrorHandler, withAccessCheck } from '../../shared'
import type { AccessGuard } from '../../shared'
import type { TaskRunnerProvider } from '../../modules/task-runner'

import { CancelHandler } from './handler'

/**
 * Creates the batch cancel endpoint
 */
export function createCancelRoute(
  taskRunnerFactory: TaskRunnerProvider,
  access?: AccessGuard,
  basePath = '/translate',
): Endpoint {
  const handler = new CancelHandler(taskRunnerFactory)

  return {
    path: `${basePath}/cancel`,
    method: 'delete',
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access),
  }
}
