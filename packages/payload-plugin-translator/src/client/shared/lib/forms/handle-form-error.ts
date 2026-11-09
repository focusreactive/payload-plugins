import type { UseFormReturn } from "react-hook-form";

import { NextApiError } from "../errors/handleApiError.js";

export function handleFormError<D extends object>(
  error: unknown,
  form: UseFormReturn<D, unknown, any>
) {
  if (error instanceof NextApiError) {
    if (error.details) {
      error.details?.forEach((issue) => {
        form.setError(issue.path.join(".") as `root.${string}`, {
          message: issue.message,
        });
      });
    } else {
      form.setError("root", { message: error.message });
    }
  } else if (error instanceof Error) {
    form.setError("root", { message: error.message });
  } else {
    form.setError("root", { message: "Unknown error" });
  }
}
