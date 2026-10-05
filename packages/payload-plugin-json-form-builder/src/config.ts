import type { Holds } from "./field/htmlToLexical.js";

// What the plugin settles at config time and the admin needs in the browser. Values only: the gates
// are answered on the server, and a function cannot cross to a client component at all.
//
// This module is deliberately free of React and of `@payloadcms/ui` — the plugin itself imports it,
// and a Payload config is loaded by a plain Node process that cannot read the stylesheets the admin
// packages pull in.
export type JsonFormClientConfig = {
  /** Schema path of the virtual richText field the lexical editor is mounted against. */
  anchor: string;
  /** Which block nodes that editor can hold, so html is read back no wider than it. */
  holds: Holds;
  /** The collection the upload kind picks files from. */
  uploads: false | string;
};

export const CONFIG_KEY = "jsonFormBuilder";
