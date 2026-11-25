import { ServerResponse, getByPath } from "../../../../../../server/shared/index.js";
import type { RouteHandler } from "../../../../../../server/shared/http/withErrorHandler.js";
import { fetchDocumentLocale } from "../../../../../../server/shared/payload/documentLocale.js";
import { FieldTranslationInputSchema } from "../../../../../../server/features/translate-field/model.js";
import type { FieldTranslationResult } from "../../../../../../types/wire/field-translation.js";

import { NOT_MANAGED } from "../../../../../../server/shared/http/readRefusals.js";
import type { StubDeps } from "./StubDeps.js";

/** Reads the saved source value as the real route does, and marks it instead of translating it. */
export function translateField({ managed }: Pick<StubDeps, "managed">): RouteHandler {
  return async (req) => {
    const parsed = FieldTranslationInputSchema.safeParse(await req.json?.());
    if (parsed.error) return ServerResponse.validationError(parsed.error.issues);

    const { collection_slug, field_path, target_lng, source_lng, doc_id } = parsed.data;
    if (!managed.has(collection_slug)) return ServerResponse.badRequest(NOT_MANAGED);

    const source = await fetchDocumentLocale({
      payload: req.payload,
      collection: collection_slug,
      id: doc_id,
      locale: source_lng,
      user: req.user,
    });
    if (!source) return ServerResponse.notFound();

    const value = getByPath(source, field_path);
    const result: FieldTranslationResult =
      typeof value === "string"
        ? { status: "translated", value: `[${target_lng}] ${value}` }
        : {
            status: "noop",
            notice: {
              level: "info",
              reason: "not-translatable",
              message: "The stub translates plain text fields only.",
            },
          };
    return ServerResponse.success(result);
  };
}
