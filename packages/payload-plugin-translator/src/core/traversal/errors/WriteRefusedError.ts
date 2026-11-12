import type { Slot } from "../contract.js";
import { TraversalError } from "./TraversalError.js";

/**
 * A write the walk collected — a placement or a translation — was refused by its position.
 *
 * The position exists but refuses the value: a frozen or sealed holder, a member with only a
 * getter. `Reflect.set` answers `false` where an assignment would have thrown, so the refusal is
 * raised rather than silently dropped.
 *
 * @public
 */
export class WriteRefusedError extends TraversalError {
  readonly key: Slot["key"];

  constructor(key: Slot["key"]) {
    super(`the position "${String(key)}" refused the value written to it`);
    this.name = "WriteRefusedError";
    this.key = key;
  }
}
