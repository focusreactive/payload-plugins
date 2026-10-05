import type { Config, Field, JSONField, Plugin, RichTextField } from "payload";
import { anchorField } from "./field/anchorField.js";
import { MARKER } from "./field/index.js";
import type { BuildGate } from "./field/index.js";
import type { Holds } from "./field/htmlToLexical.js";
import { CONFIG_KEY } from "./config.js";
import type { JsonFormClientConfig } from "./config.js";

const FIELD = "@focus-reactive/payload-plugin-json-form-builder/rsc#JsonFormField";
const ANCHOR_NAME = "jsonFormAnchor";

export type JsonFormPluginConfig = {
  /**
   * Who may open the builder and write json by hand. Everyone by default: the field already sits
   * behind the document's own update access.
   */
  build?: BuildGate;
  /**
   * `false` turns rich text off — the kind leaves the palette and no anchor is added.
   */
  richText?:
    | false
    | {
        /** The lexical editor a rich text node is edited with. */
        editor: RichTextField["editor"];
        /**
         * Which block nodes that editor can hold. Everything by default, which is what Payload's
         * own converters write. Narrow it for a reduced editor: a heading handed to an editor with
         * no heading feature is a node it cannot draw.
         */
        holds?: Holds;
      };
  /** The collection the upload kind picks files from. `false` removes the kind. */
  uploads?: false | string;
};

// Every field, however deeply it is nested — a json field can sit inside a group, a row, a tab, or a
// block, and the plugin has to find it wherever the consumer put it.
const walk = (fields: Field[] | undefined, visit: (field: Field) => void) => {
  for (const field of fields ?? []) {
    visit(field);
    if ("fields" in field && Array.isArray(field.fields)) walk(field.fields, visit);
    if ("tabs" in field && Array.isArray(field.tabs))
      for (const tab of field.tabs) walk(tab.fields, visit);
    if ("blocks" in field && Array.isArray(field.blocks)) {
      for (const block of field.blocks) if (typeof block === "object") walk(block.fields, visit);
    }
  }
};

const marked = (field: Field) =>
  field.type === "json" ? ((field.custom?.[MARKER] ?? null) as { build?: BuildGate } | null) : null;

const freeName = (fields: Field[]) => {
  const taken = new Set(fields.map((field) => ("name" in field ? field.name : "")));
  let name = ANCHOR_NAME;
  for (let n = 2; taken.has(name); n++) name = `${ANCHOR_NAME}${n}`;
  return name;
};

export const jsonFormPlugin =
  (options: JsonFormPluginConfig = {}): Plugin =>
  (incoming: Config): Config => {
    const { build = true, richText = false, uploads = "media" } = options;
    const config: Config = { ...incoming };

    // Every host that holds one, in the order the config declares them. The first is where the
    // anchor goes: it is schema-only, so one anywhere serves every json field in the admin.
    const hosts: { fields: Field[]; prefix: string }[] = [];
    const attach = (fields: Field[], prefix: string) => {
      let found = false;
      walk(fields, (field) => {
        const own = marked(field);
        if (!own) return;
        found = true;
        const json = field as JSONField;
        json.admin = {
          ...json.admin,
          components: {
            ...json.admin?.components,
            Field: { path: FIELD, serverProps: { build: own.build ?? build } },
          },
        };
      });
      if (found) hosts.push({ fields, prefix });
    };

    config.collections = incoming.collections?.map((collection) => {
      attach(collection.fields, collection.slug);
      return collection;
    });
    config.globals = incoming.globals?.map((global) => {
      attach(global.fields, `global.${global.slug}`);
      return global;
    });

    // No anchor, no rich text: `RenderLexical` has nothing to point at, so the kind is withdrawn
    // rather than left to render an empty box nobody can explain.
    let anchor = "";
    if (richText && hosts[0]) {
      const name = freeName(hosts[0].fields);
      hosts[0].fields.push(anchorField(name, richText.editor));
      anchor = `${hosts[0].prefix}.${name}`;
    }

    const client: JsonFormClientConfig = {
      anchor,
      holds: richText ? (richText.holds ?? {}) : {},
      uploads,
    };
    config.admin = { ...config.admin, custom: { ...config.admin?.custom, [CONFIG_KEY]: client } };

    return config;
  };
