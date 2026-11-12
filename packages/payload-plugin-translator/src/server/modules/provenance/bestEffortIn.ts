import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import { swallowOrThrow } from "../../shared/payload/swallowOrThrow.js";
import type { ProvenanceLogger } from "./Provenance.shapes.js";

/** What a failed best-effort step names in the log, beyond the error and the message. */
export type AboutTheReceipt = {
  collection: string;
  documentId: string;
  targetLocale?: string;
  sourceLocale?: string;
};

export type BestEffort = <T>(
  about: AboutTheReceipt,
  msg: string,
  work: () => Promise<T>
) => Promise<T | undefined>;

/**
 * Logs a failed step with the receipt it concerns and answers `undefined` — unless the caller is in
 * a transaction and the error does not declare itself harmless, which {@link swallowOrThrow}
 * rethrows.
 */
export const bestEffortIn =
  (scope: RequestScope, logger: ProvenanceLogger): BestEffort =>
  (about, msg, work) =>
    swallowOrThrow(scope, work, (err) => logger.error({ err, ...about, msg }));
