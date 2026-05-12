import type { PayloadRequest } from 'payload'

import { ServerResponse } from '../../shared'
import type { TaskRunnerProvider } from '../../modules/task-runner'

import { CancelInputSchema } from './model'

/**
 * Cancels and deletes translation tasks by IDs
 */
export class CancelHandler {
  constructor(private readonly taskRunnerFactory: TaskRunnerProvider) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = CancelInputSchema.safeParse(await req.json?.())
    if (validationResult.error) return ServerResponse.validationError(validationResult.error.errors)

    const { ids } = validationResult.data
    const runner = this.taskRunnerFactory.create(req.payload)
    await runner.cancel(ids)

    return ServerResponse.noContent()
  }
}
