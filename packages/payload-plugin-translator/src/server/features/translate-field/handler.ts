import type { CollectionSlug, PayloadRequest } from "payload";

import { getByPath, ServerResponse } from "../../shared";
import { translateContent } from "../../modules/translation-pipeline";

import { FieldTranslationInputSchema, MAX_FIELD_VALUE_BYTES } from "./model";
import type {
  FieldTranslationConfig,
  FieldTranslationNotice,
  FieldTranslationResult,
} from "./model";
import { resolveFieldSubtree } from "./resolveFieldSubtree";

const byteLength = (value: unknown): number =>
  new TextEncoder().encode(JSON.stringify(value) ?? "").length;

const noop = (
  value: unknown,
  level: FieldTranslationNotice["level"],
  message: string
): FieldTranslationResult => ({
  status: "noop",
  value,
  notice: { level, message },
});

/**
 * Synchronous single-field translation: read the field's value from the saved document in the
 * chosen source locale, resolve the declared field path to its schema subtree, run
 * `translateContent`, and return the translated value. No persistence — the result is written to
 * form state by the caller.
 *
 * From-locale only: `source_lng` + `doc_id` are required (validated by the schema), so there is
 * always exactly one DB read. Reserves HTTP errors for genuine errors — "nothing to translate"
 * and "couldn't resolve the block" come back as a 200 `noop` with a notice.
 */
export class TranslateFieldHandler {
  private readonly config: FieldTranslationConfig;

  constructor(config: FieldTranslationConfig) {
    this.config = config;
  }

  async handle(req: PayloadRequest): Promise<Response> {
    const parsed = FieldTranslationInputSchema.safeParse(await req.json?.());
    if (parsed.error) return ServerResponse.validationError(parsed.error.issues);

    const { collection_slug, field_path, target_lng, source_lng, doc_id } = parsed.data;

    const fields = this.config.schemaMap.get(collection_slug);
    if (!fields)
      return ServerResponse.badRequest(
        `Collection "${collection_slug}" is not available for translation`
      );

    // Read the source value from the saved document in `source_lng` (fallbackLocale: false so an
    // empty source reads as empty → noop, not a fallback). The doc also lets the resolver
    // disambiguate `blocks` — their `blockType` lives in the data.
    const sourceDoc = await req.payload.findByID({
      collection: collection_slug as CollectionSlug,
      id: doc_id, // JobIdSchema normalizes to a string; Payload coerces per the collection's id type
      locale: source_lng,
      fallbackLocale: false,
      depth: 0,
    });
    const sourceValue = getByPath(sourceDoc as Record<string, unknown>, field_path);

    // Guard the *translated* payload (held synchronously through the provider call), not the
    // request body, which now carries no field value.
    if (byteLength(sourceValue) > MAX_FIELD_VALUE_BYTES) {
      return ServerResponse.custom(
        `Field value exceeds the ${MAX_FIELD_VALUE_BYTES}-byte limit`,
        413
      );
    }

    const resolution = resolveFieldSubtree(fields, field_path, sourceValue, sourceDoc);

    if (resolution.status === "not-found") {
      return ServerResponse.badRequest(
        `Field path "${field_path}" was not found in collection "${collection_slug}"`
      );
    }
    if (resolution.status === "inside-blocks") {
      return ServerResponse.success(
        noop(
          sourceValue,
          "info",
          "Couldn't resolve the block for this field in the source document"
        )
      );
    }
    if (resolution.status === "localized-list-ancestor") {
      // Inside a localized blocks/array: its order/content is independent per locale, so the path
      // index can't be matched to the source locale. Translate the whole document instead.
      return ServerResponse.success(
        noop(
          sourceValue,
          "warning",
          "This field is inside a localized block — translate the whole document instead, so blocks stay aligned across locales"
        )
      );
    }
    if (resolution.status === "not-translatable") {
      return ServerResponse.success(
        noop(sourceValue, "info", "Nothing to translate in this field")
      );
    }

    // No `strategy`/`targetData`: a per-field translate is an explicit "translate this field now",
    // so `translateContent` always overwrites (its default). skip_existing has no meaning here.
    const translated = await translateContent({
      schema: resolution.schema,
      sourceData: resolution.sourceData,
      sourceLng: source_lng,
      targetLng: target_lng,
      translationProvider: this.config.translationProvider,
    });

    if (!translated) {
      return ServerResponse.success(
        noop(sourceValue, "info", "Nothing to translate in this field")
      );
    }

    const result: FieldTranslationResult = {
      status: "translated",
      value: translated[resolution.fieldName],
    };
    return ServerResponse.success(result);
  }
}
