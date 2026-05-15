import { FetchError } from "ofetch";
import type { ZodIssue } from "zod";

export class TranslationApiError extends Error {
  constructor(
    readonly message: string,
    readonly details?: ZodIssue[]
  ) {
    super(message);
  }
}

interface ApiErrorResponse {
  message: string;
  details?: ZodIssue[];
}

export async function handleApiError<R>(callback: () => Promise<R>) {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof FetchError && error.data) {
      const payload = error.data as ApiErrorResponse;
      throw new TranslationApiError(payload.message, payload.details);
    }
    if (error instanceof Error) {
      throw new TranslationApiError(error.message);
    }
    throw new TranslationApiError("Unknown error");
  }
}
