import type { ClientField } from "payload";
import { transformUploadValues } from "./transform-upload-values";
import type { UploadWalkContext } from "./transform-upload-values";
import { uploadKey } from "./types";
import type { UploadRef } from "./types";

export function collectUploadRefs(values: Record<string, unknown>, fields: ClientField[], ctx: UploadWalkContext): UploadRef[] {
  const refs: UploadRef[] = [];
  const seen = new Set<string>();

  transformUploadValues(values, fields, ctx, (ref) => {
    const key = uploadKey(ref);
    if (!seen.has(key)) {
      seen.add(key);
      refs.push(ref);
    }

    return undefined;
  });

  return refs;
}
