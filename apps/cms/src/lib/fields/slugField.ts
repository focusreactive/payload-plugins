import { slugField as payloadSlugField } from "payload";
import type { PayloadRequest } from "payload";

/**
 * Shared slug field for Pages and Posts.
 * - required: true
 * - localized: true - every language gets its own slug, e.g. "japan" (en) and
 *   "日本" (ja) for the same document. Payload stores a localized field's
 *   column on the collection's `_locales` table rather than the base table,
 *   and its DB unique index is built there too - confirmed by running
 *   `payload migrate:create`, which generated the index on the `_locales`
 *   table scoped to (slug, _locale) rather than the old global unique
 *   constraint on the base table. Two different locales can now legally
 *   reuse the same slug text; the same locale still can't reuse it twice.
 * - validated to be unique across both collections, scoped to the locale
 *   being written: an unscoped cross-collection check would reject "japan" in
 *   posts for every locale the moment "japan" existed as a page slug in any
 *   one locale.
 */
export const createSharedSlugField = (currentCollection: "page" | "posts") => {
  const otherCollection = currentCollection === "page" ? "posts" : "page";
  const otherLabel = otherCollection === "page" ? "a page" : "a post";

  return payloadSlugField({
    localized: true,
    overrides: (field) => {
      const slugInput = field.fields?.[1] as { unique?: boolean; validate?: unknown } | undefined;

      if (slugInput) {
        slugInput.unique = true;
        slugInput.validate = async (
          value: string | null | undefined,
          { req }: { req: PayloadRequest }
        ): Promise<string | true> => {
          if (!value || !req?.payload) {
            return true;
          }

          const result = await req.payload.find({
            collection: otherCollection,
            limit: 1,
            locale: req.locale,
            overrideAccess: true,
            where: { slug: { equals: value } },
          });

          return result.totalDocs === 0 ? true : `This slug is already used by ${otherLabel}`;
        };
      }

      return field;
    },
    required: true,
    useAsSlug: "title",
  });
};
