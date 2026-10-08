/** The root of every failure this plugin raises itself. */
export abstract class TranslatorError extends Error {
  /**
   * Whether this failure must be let out rather than logged and swallowed.
   *
   * `true` means the caller's work is already gone by the time this error exists, so staying quiet
   * would report success over a rolled-back write. It does not mean "fatal": the process is fine.
   *
   * A failure raised before any Payload operation ran leaves the caller's work intact and is
   * `false` — the translation is lost, the editor's save is not.
   */
  abstract readonly mustPropagate: boolean;

  constructor(message: string, options?: ErrorOptions) {
    // Through `super`, never `this.cause = …`: an assigned property is enumerable, so a logger
    // serializing the error would carry the original — vendor headers and API key included.
    super(message, options);
    this.name = new.target.name;
  }
}

/** Fail-safe: a foreign error may already have rolled the caller's transaction back, so assume it did. */
export function mustPropagate(error: unknown): boolean {
  return !(error instanceof TranslatorError) || error.mustPropagate;
}
