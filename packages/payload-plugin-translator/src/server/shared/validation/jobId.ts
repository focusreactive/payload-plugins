import { z } from "zod";

/**
 * Zod schema for a Payload document/job ID over the HTTP boundary.
 *
 * Accepts the two shapes IDs can arrive in: a JS string (UUID, MongoDB
 * ObjectId hex, custom string id) or a JS number (SQLite/Postgres integer
 * autoincrement). Anything else (null, undefined, boolean, object, array)
 * is rejected by the union itself. The schema normalizes to a non-empty
 * string so callers can compare and Set-membership-check uniformly.
 *
 * NOTE: This is intentionally a wire-format guard, not a domain check. We
 * do not pattern-match for UUID v4 or ObjectId here — different deployments
 * use different ID formats, and a stricter regex would lock the plugin to
 * one adapter. Callers that need DB-specific validation should layer it
 * on top.
 */
export const JobIdSchema = z
  .union([
    z.string().refine((val) => val.length > 0 && val !== "undefined", {
      message: "ID must be a non-empty string",
    }),
    z.number().finite(),
  ])
  .transform(String);
