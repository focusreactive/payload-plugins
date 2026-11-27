import { z } from "zod";

/**
 * A Payload document id as it arrives over HTTP.
 *
 * Accepts the two shapes an id can arrive in: a string (UUID, MongoDB ObjectId hex, custom string
 * id) or a number (SQLite/Postgres autoincrement). Anything else — null, undefined, boolean, object,
 * array — is rejected by the union itself. It normalizes to a non-empty string so callers can
 * compare and Set-membership-check uniformly.
 *
 * Deliberately a wire-format guard, not a domain check: deployments use different id formats, and a
 * UUID or ObjectId pattern here would lock the plugin to one database adapter. A caller needing a
 * stricter rule layers it on top.
 */
export const DocumentIdSchema = z
  .union([
    z.string().refine((val) => val.length > 0 && val !== "undefined", {
      message: "ID must be a non-empty string",
    }),
    z.number().finite(),
  ])
  .transform(String);
