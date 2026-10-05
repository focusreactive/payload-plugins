import type { RichTextField } from "payload";

// `RenderLexical` mounts a lexical editor by pointing at a richText field Payload has already
// sanitized — it cannot be built from an editor config alone. A rich text value inside json is not
// a field to Payload, only a key in an object, so one real field has to exist for the editor to
// aim at. This is it: `virtual` keeps it out of the database, `admin.hidden` out of every form, and
// `readOnly: false` is needed because Payload makes a virtual field read-only otherwise — toolbar
// and all. Nothing is ever stored in it.
export const anchorField = (name: string, editor: RichTextField["editor"]): RichTextField => ({
  name,
  type: "richText",
  admin: { hidden: true, readOnly: false },
  editor,
  virtual: true,
});
