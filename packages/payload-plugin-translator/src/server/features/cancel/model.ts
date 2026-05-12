import { z } from "zod";

import { JobIdSchema } from "../../shared";

/**
 * Input validation schema for batch cancel.
 */
export const CancelInputSchema = z.object({
  ids: z.array(JobIdSchema).min(1),
});
