import type { JSONField } from "payload";
import { deepMerge } from "../field/deepMerge.js";
import { jsonField, MARKER } from "../field/index.js";

export type JsonLibraryOptions = {
  name?: string;
  label?: string;
  description?: string;
};

export const jsonLibraryField = ({
  name = "shared",
  label = "Shared sections",
  description = "Reusable sections. Build one here and any document can attach it, fill in its own values and follow this shape — the form is written once, the content stays theirs. Removing one here leaves it in the documents that had it, no longer following.",
}: JsonLibraryOptions = {}): JSONField =>
  deepMerge<JSONField>(jsonField({ name, label }), {
    admin: { description },
    custom: { [MARKER]: { library: true } },
  });
