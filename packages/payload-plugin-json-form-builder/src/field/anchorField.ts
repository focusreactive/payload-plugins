import type { RichTextField } from "payload";

// `RenderLexical` can only mount against a richText field Payload has already sanitized, and a
// rich text value inside json is not a field. `readOnly: false` is needed: Payload makes a
// virtual field read-only otherwise, toolbar and all. Nothing is ever stored in it.
export const anchorField = (name: string, editor: RichTextField["editor"]): RichTextField => ({
  name,
  type: "richText",
  admin: { hidden: true, readOnly: false },
  editor,
  virtual: true,
});
