/**
 * A crossing named a language the walk was not given.
 *
 * Always a wiring mistake, never bad data: either a language was left out of `languages`, or a
 * `Crossing` carries an id nobody registered. {@link UnknownLanguageError.known} lists what was
 * registered, so a typo is visible without a debugger.
 *
 * @public
 */
export class UnknownLanguageError extends Error {
  /** The id that was asked for. */
  readonly languageId: string;
  /** Every id the walk does hold, in registration order. */
  readonly known: readonly string[];

  constructor(languageId: string, known: readonly string[]) {
    super(`unknown traversal language "${languageId}"; registered: ${known.join(", ") || "none"}`);
    this.name = "UnknownLanguageError";
    this.languageId = languageId;
    this.known = known;
  }
}
