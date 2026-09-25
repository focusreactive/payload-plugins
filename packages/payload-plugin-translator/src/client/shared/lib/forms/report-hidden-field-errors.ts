import { toast } from "@payloadcms/ui";
import type { FieldErrors } from "react-hook-form";

// The collection slug and document id are hidden inputs, so a validation failure on either one has
// no field to show its message under, and the submit button looked like it did nothing.
export function reportHiddenFieldErrors(errors: FieldErrors, hiddenFieldNames: readonly string[]) {
  const hiddenFieldError = hiddenFieldNames.find((fieldName) => errors[fieldName]);
  if (hiddenFieldError) {
    toast.error("This document could not be identified. Reload the page and try again.");
  }
}
