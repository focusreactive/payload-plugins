import type { Endpoint } from 'payload'

import { withErrorHandler, withAccessCheck } from '../../shared'
import type { AccessGuard } from '../../shared'
import type { TaskRunnerProvider } from '../../modules/task-runner'

import { RunTranslationHandler } from './handler'

/**
 * Creates the run translation endpoint
 */
export function createRunRoute(
  taskRunnerFactory: TaskRunnerProvider,
  access?: AccessGuard,
  basePath = '/translate',
): Endpoint {
  const handler = new RunTranslationHandler(taskRunnerFactory)

  return {
    path: `${basePath}/run/:id`,
    method: 'post',
    handler: withAccessCheck(withErrorHandler(handler.handle.bind(handler)), access),
  }
}
