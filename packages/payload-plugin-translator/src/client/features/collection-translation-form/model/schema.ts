import { z } from "zod";

import { FORM_FIELDS } from "./constants";

export const validationSchema = z.object({
  [FORM_FIELDS.SOURCE_LNG]: z.string().nonempty(""),
  // Single mode binds a string; multi mode binds a non-empty string[]. The empty value of either
  // shape ("" / []) fails validation, so a target must always be chosen before submit (AC7).
  [FORM_FIELDS.TARGET_LNG]: z.union([z.string().nonempty(""), z.array(z.string()).min(1)]),
  [FORM_FIELDS.HIDDEN_COLLECTION_SLUG]: z.string().nonempty(),
  [FORM_FIELDS.STRATEGY]: z.enum(["overwrite", "skip_existing"]),
  [FORM_FIELDS.PUBLISH_ON_TRANSLATION]: z.boolean().default(false),
});

export type FormValues = z.infer<typeof validationSchema>;

export type FormInput = Partial<FormValues>;
