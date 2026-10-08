import type { Holds } from "./field/htmlToLexical.js";

// No React and no `@payloadcms/ui` here: a Payload config is loaded by a plain Node process that
// cannot read the stylesheets those packages pull in.
export type JsonFormClientConfig = {
  anchor: string;
  holds: Holds;
  uploads: false | string;
  library: null | { global: string; field: string };
};

export const CONFIG_KEY = "jsonFormBuilder";
