import { TranslatorError } from "../../../core/errors/index.js";

export type GuardedWrite = "create" | "update" | "delete" | "duplicate" | "restoreVersion";

/**
 * A chain module tried to write the collection the run is translating. Raised before any write, yet
 * `mustPropagate`: inside a transaction the run stops rather than carry on past a module that
 * believes it wrote. Outside one, `swallowOrThrow` logs it like any other module failure.
 */
export class ModuleWroteTheRunsOwnDocument extends TranslatorError {
  readonly mustPropagate = true;

  constructor(operation: GuardedWrite, collection: string) {
    super(
      `a translation-run module called \`${operation}\` on "${collection}", which is the collection this run is translating`
    );
  }
}
