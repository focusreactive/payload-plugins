import { z } from "zod";

import { FORM_FIELDS } from "./constants";

export const validationSchema = z.object({
  [FORM_FIELDS.SOURCE_LNG]: z.string().nonempty(""),
  [FORM_FIELDS.TARGET_LNG]: z.string().nonempty(""),
  [FORM_FIELDS.HIDDEN_COLLECTION_SLUG]: z.string().nonempty(),
  [FORM_FIELDS.STRATEGY]: z.enum(["overwrite", "skip_existing"]),
  [FORM_FIELDS.PUBLISH_ON_TRANSLATION]: z.boolean().default(false),
});

export type FormValues = z.infer<typeof validationSchema>;

export type FormInput = Partial<FormValues>;
