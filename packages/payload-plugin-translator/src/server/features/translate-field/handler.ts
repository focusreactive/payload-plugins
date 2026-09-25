import type { CollectionSlug, PayloadRequest } from "payload";

import { getByPath, ServerResponse } from "../../shared/index.js";
import { translateContent } from "../../../core/translation-pipeline/index.js";
import { extractLocaleCodes } from "../../modules/auto-translate/index.js";
import type { LocalizationLike } from "../../modules/auto-translate/index.js";

import type {
  FieldTranslationNotice,
  FieldTranslationReason,
  FieldTranslationResult,
} from "../../../types/wire/field-translation.js";
import { FieldTranslationInputSchema, MAX_FIELD_VALUE_BYTES } from "./model.js";
import type { FieldTranslationConfig } from "./model.js";
import { resolveFieldSubtree } from "./resolveFieldSubtree.js";
import { fetchSourceDocument } from "../../shared/payload/sourceDocument.js";

const byteLength = (value: unknown): number =>
  new TextEncoder().encode(JSON.stringify(value) ?? "").length;

const noop = (
  level: FieldTranslationNotice["level"],
  reason: FieldTranslationReason,
  message: string
): FieldTranslationResult => ({
  status: "noop",
  notice: { level, reason, message },
});

/**
 * `POST {basePath}/field`. Translates the **saved** value at `doc_id` in `source_lng` — the request
 * carries no value, so unsaved form edits are invisible — and writes nothing; the caller persists.
 * "Cannot translate" answers `200` with `status: "noop"` and a `reason`; HTTP status is reserved for
 * a bad request.
 */
export type FieldTranslation = (req: PayloadRequest) => Promise<Response>;

export class TranslateFieldHandler {
  private readonly config: FieldTranslationConfig;

  constructor(config: FieldTranslationConfig) {
    this.config = config;
  }

  handle: FieldTranslation = async (req) => {
    const parsed = FieldTranslationInputSchema.safeParse(await req.json?.());
    if (parsed.error) return ServerResponse.validationError(parsed.error.issues);

    const { collection_slug, field_path, target_lng, source_lng, doc_id } = parsed.data;

    const fields = this.config.schemaMap.get(collection_slug);
    if (!fields)
      return ServerResponse.badRequest(
        `Collection "${collection_slug}" is not available for translation`
      );

    const known = extractLocaleCodes(
      req.payload?.config?.localization as LocalizationLike | undefined
    );
    if (!known)
      return ServerResponse.badRequest(
        "Localization is not enabled in this Payload config; there is nothing to translate between"
      );
    for (const [name, code] of [
      ["source_lng", source_lng],
      ["target_lng", target_lng],
    ] as const) {
      if (!known.has(code))
        return ServerResponse.badRequest(
          `${name} "${code}" is not one of this project's configured locales`
        );
    }

    // The whole document, not just the field: the resolver needs it to disambiguate `blocks`, whose
    // `blockType` lives in the data.
    const sourceDoc = await fetchSourceDocument(
      req.payload,
      collection_slug as CollectionSlug,
      doc_id, // JobIdSchema normalizes to a string; Payload coerces per the collection's id type
      source_lng
    );
    const sourceValue = getByPath(sourceDoc as Record<string, unknown>, field_path);

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
          "info",
          "block-unresolved",
          "Couldn't resolve the block for this field in the source document"
        )
      );
    }
    if (resolution.status === "localized-list-ancestor") {
      return ServerResponse.success(
        noop(
          "warning",
          "localized-list",
          "This field is inside a localized block — translate the whole document instead, so blocks stay aligned across locales"
        )
      );
    }
    if (resolution.status === "not-translatable") {
      return ServerResponse.success(
        noop("info", "not-translatable", "Nothing to translate in this field")
      );
    }
    if (resolution.status === "excluded") {
      return ServerResponse.success(
        noop("info", "excluded", "This field is excluded from translation")
      );
    }

    const translated = await translateContent({
      schema: resolution.schema,
      sourceData: resolution.sourceData,
      sourceLng: source_lng,
      targetLng: target_lng,
      translationProvider: this.config.translationProvider,
      inlineMarks: this.config.inlineMarks,
    });

    if (!translated) {
      return ServerResponse.success(
        noop("info", "nothing-translatable", "Nothing to translate in this field")
      );
    }

    const result: FieldTranslationResult = {
      status: "translated",
      value: translated[resolution.fieldName],
    };
    return ServerResponse.success(result);
  };
}
