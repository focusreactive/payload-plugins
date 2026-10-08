import type { Holds } from "./field/htmlToLexical.js";
import type { TypedNode } from "./field/typedJson.js";

// A ready-made subtree offered in the palette above the kinds it is built from. What it drops is
// ordinary content from that moment on — free to rename, extend or take apart.
export type JsonFormShape = {
  name: string;
  glyph?: string;
  draws?: string;
  fields: TypedNode[];
};

// No React and no `@payloadcms/ui` here: a Payload config is loaded by a plain Node process that
// cannot read the stylesheets those packages pull in.
export type JsonFormClientConfig = {
  anchor: string;
  holds: Holds;
  uploads: false | string;
  library: null | { global: string; field: string };
  shapes: JsonFormShape[];
};

export const CONFIG_KEY = "jsonFormBuilder";
