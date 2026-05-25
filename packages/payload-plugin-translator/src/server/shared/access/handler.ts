import type { Payload } from 'payload'

/**
 * Base handler interface for all feature handlers
 */
export interface Handler<TInput, TOutput> {
  handle(payload: Payload, input: TInput): Promise<TOutput>
}
