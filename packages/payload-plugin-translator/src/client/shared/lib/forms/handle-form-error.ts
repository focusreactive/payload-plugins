import type { UseFormReturn } from "react-hook-form";
import type { ZodIssue } from "zod";

import { ApiRequestError } from "../../api/errors/ApiRequestError.js";
import { NextApiError } from "../../api/handleApiError.js";

const fieldErrorsOf = (error: unknown): ZodIssue[] | undefined =>
  error instanceof ApiRequestError || error instanceof NextApiError ? error.details : undefined;

export function handleFormError<D extends object>(
  error: unknown,
  form: UseFormReturn<D, unknown, any>
) {
  const details = fieldErrorsOf(error);
  if (details) {
    details.forEach((issue) => {
      form.setError(issue.path.join(".") as `root.${string}`, { message: issue.message });
    });
  } else if (error instanceof Error) {
    form.setError("root", { message: error.message });
  } else {
    form.setError("root", { message: "Unknown error" });
  }
}
