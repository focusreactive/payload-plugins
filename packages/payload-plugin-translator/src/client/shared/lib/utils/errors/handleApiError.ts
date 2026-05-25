import { FetchError } from 'ofetch'
import type { ZodIssue } from 'zod'

export class TranslationApiError extends Error {
  constructor(
    readonly message: string,
    readonly details?: ZodIssue[],
  ) {
    super(message)
  }
}

type ApiErrorResponse = {
  message: string
  details?: ZodIssue[]
}

export async function handleApiError<R>(callback: () => Promise<R>) {
  try {
    return await callback()
  } catch (e) {
    if (e instanceof FetchError && e.data) {
      const payload = e.data as ApiErrorResponse
      throw new TranslationApiError(payload.message, payload.details)
    }
    if (e instanceof Error) {
      throw new TranslationApiError(e.message)
    }
    throw new TranslationApiError('Unknown error')
  }
}
