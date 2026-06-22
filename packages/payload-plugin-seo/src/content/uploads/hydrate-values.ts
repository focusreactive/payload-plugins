import type { ClientField } from "payload";
import { transformUploadValues } from "./transform-upload-values";
import type { UploadWalkContext } from "./transform-upload-values";
import { uploadKey } from "./types";
import type { ResolvedUploadDoc } from "./types";

function isRenderable(doc: ResolvedUploadDoc): boolean {
  return typeof doc.url === "string" && typeof doc.mimeType === "string";
}

export function hydrateUploadValues(
  values: Record<string, unknown>,
  fields: ClientField[],
  ctx: UploadWalkContext,
  resolved: Map<string, ResolvedUploadDoc>
): Record<string, unknown> {
  return transformUploadValues(values, fields, ctx, (ref) => {
    const doc = resolved.get(uploadKey(ref));

    return doc && isRenderable(doc) ? doc : null;
  });
}
