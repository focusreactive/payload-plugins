import type { TranslationLifecycleCallbacks, TranslationTask } from "./types";

/** Minimal logger surface used for swallowed callback errors (Payload's `payload.logger` satisfies it). */
type LifecycleLogger = { error: (obj: unknown) => void };

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
    const callback = this.callbacks.onQueued;
    return this.safe("lifecycle.onQueued", callback && (() => callback(task)));
  }

  completed(task: TranslationTask): Promise<void> {
    const callback = this.callbacks.onCompleted;
    return this.safe("lifecycle.onCompleted", callback && (() => callback(task)));
  }

  failed(task: TranslationTask, error: unknown): Promise<void> {
    const callback = this.callbacks.onFailed;
    return this.safe("lifecycle.onFailed", callback && (() => callback(task, error)));
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
