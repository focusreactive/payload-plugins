import { z } from "zod";

/** What a job row stores as a string: long enough for a UUID handle or a locale code, and bounded
 * so a malformed row cannot be unbounded. */
const MAX_STORED_STRING = 256;

/**
 * The locale list is the one run fact kept here: the workflow walks it, and a runner never reads the
 * plugin's record.
 */
export const WorkflowInputSchema = z.object({
  handle: z.string().max(MAX_STORED_STRING),
  locales: z.array(z.string().max(MAX_STORED_STRING)),
});

export const TaskInputSchema = z.object({
  handle: z.string().max(MAX_STORED_STRING),
  target_lng: z.string().max(MAX_STORED_STRING),
});
