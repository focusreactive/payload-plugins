import type { PayloadRequest } from 'payload'

import { ServerResponse } from '../../shared'
import type { TaskRunnerProvider } from '../../modules/task-runner'

import { RunInputSchema } from './model'

/**
 * Runs a translation task by ID
 */
export class RunTranslationHandler {
  constructor(private readonly taskRunnerFactory: TaskRunnerProvider) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = RunInputSchema.safeParse(req.routeParams)
    if (validationResult.error) return ServerResponse.validationError(validationResult.error.errors)

    const { id } = validationResult.data
    const runner = this.taskRunnerFactory.create(req.payload)
    const result = await runner.run(id)

    if (!result.success) {
      if (result.error === 'not_found' || result.error === 'already_completed') {
        return ServerResponse.notFound('Queued task not found')
      }
      if (result.error === 'already_running') {
        return ServerResponse.tooManyRequests('Translation task is already in progress')
      }
    }

    return ServerResponse.noContent()
  }
}
