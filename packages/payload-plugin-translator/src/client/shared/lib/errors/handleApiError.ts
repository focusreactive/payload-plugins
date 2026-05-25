import { FetchError } from 'ofetch'
import type { ZodIssue } from 'zod'

export class NextApiError extends Error {
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

export async function handleNextApiError<R>(callback: () => Promise<R>) {
  try {
    return await callback()
  } catch (e) {
    if (e instanceof FetchError && e.data) {
      const payload = e.data as ApiErrorResponse
      throw new NextApiError(payload.message, payload.details)
    }
    if (e instanceof Error) {
      throw new NextApiError(e.message)
    }
    throw new NextApiError('Unknown error')
  }
}
