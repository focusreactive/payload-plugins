export const FORM_FIELDS = {
  SOURCE_LNG: "source_lng",
  TARGET_LNG: "target_lng",
  HIDDEN_COLLECTION_SLUG: "collection_slug",
  PUBLISH_ON_TRANSLATION: "publish_on_translation",
} as const;

export const defaultValues = {
  [FORM_FIELDS.SOURCE_LNG]: "",
  [FORM_FIELDS.TARGET_LNG]: "",
  [FORM_FIELDS.HIDDEN_COLLECTION_SLUG]: "",
  [FORM_FIELDS.PUBLISH_ON_TRANSLATION]: false,
};
