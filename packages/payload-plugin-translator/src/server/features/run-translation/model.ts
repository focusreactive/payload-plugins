import { z } from 'zod'

/**
 * Input validation schema
 */
export const RunInputSchema = z.object({
  id: z.string().nonempty(),
})
