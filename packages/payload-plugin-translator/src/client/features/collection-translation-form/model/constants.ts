import type { TranslationStrategy } from "../../../shared/ui/form/FormSelectStrategy";

export const FORM_FIELDS = {
  HIDDEN_COLLECTION_SLUG: "collection_slug",
  PUBLISH_ON_TRANSLATION: "publish_on_translation",
  SOURCE_LNG: "source_lng",
  STRATEGY: "strategy",
  TARGET_LNG: "target_lng",
} as const;

export const defaultValues = {
  [FORM_FIELDS.SOURCE_LNG]: "",
  [FORM_FIELDS.TARGET_LNG]: "",
  [FORM_FIELDS.HIDDEN_COLLECTION_SLUG]: "",
  [FORM_FIELDS.STRATEGY]: "overwrite" as TranslationStrategy,
  [FORM_FIELDS.PUBLISH_ON_TRANSLATION]: false,
};
