import { z } from 'zod'

/**
 * Input validation schema for batch cancel
 */
export const CancelInputSchema = z.object({
  ids: z.array(z.string().nonempty()).min(1),
})
