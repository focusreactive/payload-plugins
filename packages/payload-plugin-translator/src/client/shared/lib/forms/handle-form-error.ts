import type { UseFormReturn } from "react-hook-form";

import { NextApiError } from "../errors/handleApiError";

export function handleFormError<D extends object>(
  error: unknown,
  form: UseFormReturn<D, unknown, any>
) {
  if (error instanceof NextApiError) {
    if (error.details) {
      error.details?.forEach((error) => {
        form.setError(error.path.join(".") as `root.${string}`, {
          message: error.message,
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
