import { slugField as payloadSlugField } from "payload";
import type { CheckboxField, FieldHook, PayloadRequest, TextField } from "payload";

const isDefaultLocaleRequest = (req: PayloadRequest) => {
  const { localization } = req.payload.config;

  return !localization || req.locale === localization.defaultLocale;
};

const keepGeneratingWhileDrafting =
  (slugFieldName: string, generateSlug: FieldHook): FieldHook =>
  async (args) => {
    const { data, operation, originalDoc, req, value: isGenerating } = args;

    if (operation === "update" && !isDefaultLocaleRequest(req)) {
      return isGenerating;
    }

    const slugEditedByUser = data?.[slugFieldName] !== originalDoc?.[slugFieldName];
    const keepsGenerating = await generateSlug(args);

    if (keepsGenerating || operation !== "update" || !isGenerating) {
      return keepsGenerating;
    }

    const isPublishing = data?._status === "published";

    return !isPublishing && !slugEditedByUser;
  };

/**
 * Shared slug field for Pages and Posts.
 * - required: true
 * - unique within the collection (DB constraint)
 * - validated to be unique across both collections
 */
export const createSharedSlugField = (currentCollection: "page" | "posts") => {
  const otherCollection = currentCollection === "page" ? "posts" : "page";
  const otherLabel = otherCollection === "page" ? "a page" : "a post";

  return payloadSlugField({
    overrides: (field) => {
      const generateSlugCheckbox = field.fields?.[0] as CheckboxField | undefined;
      const slugInput = field.fields?.[1] as TextField | undefined;

      if (generateSlugCheckbox?.hooks?.beforeChange && slugInput) {
        generateSlugCheckbox.hooks.beforeChange = generateSlugCheckbox.hooks.beforeChange.map(
          (hook) => keepGeneratingWhileDrafting(slugInput.name, hook)
        );
      }

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
