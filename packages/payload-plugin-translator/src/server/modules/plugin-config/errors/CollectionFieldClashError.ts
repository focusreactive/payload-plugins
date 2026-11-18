import { TranslatorError } from "../../../../core/errors/index.js";

/** A field the plugin adds would take a name the host's collection already uses. */
export class CollectionFieldClashError extends TranslatorError {
  readonly mustPropagate = false;
  readonly collection: string;
  readonly field: string;

  constructor(collection: string, field: string) {
    super(
      `payload-plugin-translator: collection "${collection}" already has a field named "${field}", ` +
        "which the plugin needs for its list column. Rename that field, or leave the column out of " +
        "`components`."
    );
    this.collection = collection;
    this.field = field;
  }
}
