import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";

import { CancelInputSchema } from "./model.js";

/**
 * Cancels and deletes translation tasks by IDs
 */
export class CancelHandler {
  constructor(private readonly taskRunnerFactory: TaskRunnerFactory) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = CancelInputSchema.safeParse(await req.json?.());
    if (validationResult.error) {
      return ServerResponse.validationError(validationResult.error.issues);
    }

    const { ids } = validationResult.data;
    const runner = this.taskRunnerFactory.create(req.payload);
    await runner.cancel(ids);

    return ServerResponse.noContent();
  }
}
