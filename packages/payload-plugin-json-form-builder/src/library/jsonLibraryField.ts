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
  description = "Sections built once and followed by many. A document gets its own copy of the values; the shape stays here.",
}: JsonLibraryOptions = {}): JSONField =>
  deepMerge<JSONField>(jsonField({ name, label }), {
    admin: { description },
    custom: { [MARKER]: { library: true } },
  });
