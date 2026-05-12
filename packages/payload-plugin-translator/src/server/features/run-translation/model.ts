import { z } from "zod";

import { JobIdSchema } from "../../shared";

/**
 * Input validation schema.
 *
 * `id` comes from the URL route param (always a string at the HTTP edge),
 * but we reuse the canonical JobIdSchema so the contract stays consistent
 * with batch cancel.
 */
export const RunInputSchema = z.object({
  id: JobIdSchema,
});
