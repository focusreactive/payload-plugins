import type { TranslationLifecycleCallbacks, TranslationTask } from "./types.js";

/** Minimal logger surface used for swallowed callback errors (Payload's `payload.logger` satisfies it). */
type LifecycleLogger = { error: (obj: unknown) => void };

/** The callbacks that take the task alone; `onFailed` also takes the failure, so it fires on its own. */
type TaskOnlyCallback = Exclude<keyof TranslationLifecycleCallbacks, "onFailed">;

/**
 * Fires the host's translation lifecycle callbacks, best-effort. Each callback is invoked in a
 * try/catch (covering both synchronous throws and rejected promises); a failure is logged and
 * swallowed, never propagated — a broken host callback must not fail the translation. Absent
 * callbacks are a no-op.
 */
export class LifecycleNotifier {
  private readonly callbacks: TranslationLifecycleCallbacks;
  private readonly logger: LifecycleLogger;

  constructor(callbacks: TranslationLifecycleCallbacks, logger: LifecycleLogger) {
    this.callbacks = callbacks;
    this.logger = logger;
  }

  queued(task: TranslationTask): Promise<void> {
    return this.fire("onQueued", task);
  }

  completed(task: TranslationTask): Promise<void> {
    return this.fire("onCompleted", task);
  }

  async failed(task: TranslationTask, error: unknown): Promise<void> {
    const callback = this.callbacks.onFailed;
    if (!callback) {
      this.logger.error({
        err: error,
        collection: task.collection,
        id: task.id,
        targetLng: task.targetLng,
        msg: "translator: translation failed",
      });
      return;
    }
    await this.safe("lifecycle.onFailed", () => callback(task, error));
  }

  abandoned(task: TranslationTask): Promise<void> {
    return this.fire("onAbandoned", task);
  }

  cancelled(task: TranslationTask): Promise<void> {
    return this.fire("onCancelled", task);
  }

  private fire(name: TaskOnlyCallback, task: TranslationTask): Promise<void> {
    const callback = this.callbacks[name];
    return this.safe(`lifecycle.${name}`, callback && (() => callback(task)));
  }

  private async safe(name: string, thunk?: () => void | Promise<void>): Promise<void> {
    if (!thunk) return;
    try {
      await thunk();
    } catch (error) {
      this.logger.error({ err: error, msg: `translator: ${name} callback threw` });
    }
  }
}
