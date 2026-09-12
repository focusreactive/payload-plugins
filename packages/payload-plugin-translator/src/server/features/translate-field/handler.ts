import type { CollectionSlug, PayloadRequest } from "payload";

import { getByPath, ServerResponse } from "../../shared";
import { translateContent } from "../../../core/translation-pipeline";

import type {
  FieldTranslationNotice,
  FieldTranslationResult,
} from "../../../types/wire/field-translation";
import { FieldTranslationInputSchema, MAX_FIELD_VALUE_BYTES } from "./model";
import type { FieldTranslationConfig } from "./model";
import { resolveFieldSubtree } from "./resolveFieldSubtree";
import { fetchSourceDocument } from "../../shared/payload/sourceDocument";

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
 * What a caller of `POST {basePath}/field` is owed. The types state the shapes; this states what
 * they mean.
 *
 * **The value translated is the saved one.** It is read from the document at `doc_id` in
 * `source_lng` — never from the request, which carries no value. Unsaved edits in the form are
 * therefore invisible here, and that is the contract, not an oversight.
 *
 * **Nothing is written.** The reply carries the translated value; persisting it is the caller's
 * job. The source document is left as it was, in every locale.
 *
 * **It always overwrites.** A per-field translate is an explicit "translate this one now", so
 * there is no strategy to choose and `skip_existing` has no meaning on this surface.
 *
 * **"I cannot translate this" is a success, not an error.** Six situations come back `200` with
 * `status: "noop"`, the source value unchanged, and a notice explaining which:
 *
 * | Situation | Notice level |
 * |---|---|
 * | the field holds nothing in the source locale | `info` |
 * | the field's type is not one this plugin translates | `info` |
 * | the field is excluded via `withFieldTranslation({ exclude: true })` | `info` |
 * | the path runs into `blocks` and the saved document does not say which block | `info` |
 * | the path runs through a **localized** `blocks` or `array` | `warning` |
 * | nothing translatable was found once the subtree was walked | `info` |
 *
 * The one `warning` is the case where the request is answerable but the answer would be wrong:
 * a localized list has its own order per locale, so an index in the path cannot be matched across
 * locales, and translating the whole document is the only correct route.
 *
 * **HTTP errors are kept for genuine errors:** `400` for a body that fails validation, `400` for a
 * collection the plugin does not manage, `400` for a path naming no field in that collection, and
 * `413` for a source value whose serialized size exceeds {@link MAX_FIELD_VALUE_BYTES}. The size is
 * measured on the value read from the document, because that is what is held in memory across the
 * provider call — the request body no longer carries one.
 *
 * **A path is resolved against the saved data, not the schema alone.** A segment inside `blocks`
 * needs the document's own `blockType` to know which block's fields apply. Containers that carry no
 * name — a row, an unnamed tab, a collapsible — do not appear in the path at all.
 *
 * @param req - the Payload request; the body must satisfy {@link FieldTranslationInputSchema}
 * @returns `200` with a {@link FieldTranslationResult}, or one of the errors above
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

    // The whole document, not just the field: the resolver needs it to disambiguate `blocks`, whose
    // `blockType` lives in the data.
    const sourceDoc = await fetchSourceDocument(
      req.payload,
      collection_slug as CollectionSlug,
      doc_id, // JobIdSchema normalizes to a string; Payload coerces per the collection's id type
      source_lng
    );
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
    if (resolution.status === "excluded") {
      return ServerResponse.success(
        noop(sourceValue, "info", "This field is excluded from translation")
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
      inlineMarks: this.config.inlineMarks,
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
  };
}
