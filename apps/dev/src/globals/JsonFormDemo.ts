import type { GlobalConfig } from "payload";
import { jsonField } from "@focus-reactive/payload-plugin-json-form-builder";

// A bare host for @focus-reactive/payload-plugin-json-form-builder. A global rather than a
// collection: the form is one document you open and edit, with no list, no search and nothing else
// on the page but the plugin.
export const JsonFormDemo: GlobalConfig = {
  slug: "json-form-demo",
  fields: [jsonField({ label: "Components", name: "components" })],
  label: "JSON form",
};
