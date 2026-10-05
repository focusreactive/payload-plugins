import type { Config, Field, GlobalConfig, JSONField, Plugin, RichTextField } from "payload";
import { anchorField } from "./field/anchorField.js";
import { MARKER } from "./field/index.js";
import type { BuildGate } from "./field/index.js";
import type { Holds } from "./field/htmlToLexical.js";
import { CONFIG_KEY } from "./config.js";
import type { JsonFormClientConfig } from "./config.js";

const FIELD = "@focus-reactive/payload-plugin-json-form-builder/rsc#JsonFormField";
const ANCHOR_NAME = "jsonFormAnchor";
const GLOBAL_SLUG = "json-form";

/**
 * The global the plugin adds to the config itself. It is the plugin's own place in the schema —
 * the rich text anchor lives there instead of being pushed into a document somebody else owns —
 * and it doubles as the one global a project can fill with json forms of its own.
 */
export type JsonFormGlobalConfig = {
  slug?: string;
  label?: GlobalConfig["label"];
  access?: GlobalConfig["access"];
  admin?: GlobalConfig["admin"];
  hooks?: GlobalConfig["hooks"];
  /**
   * Fields of your own — json forms, blocks, anything. Empty by default, and an empty global is
   * hidden from the admin, since the anchor beside them is never drawn.
   */
  fields?: Field[];
};

export type JsonFormPluginConfig = {
  /**
   * Who may open the builder and write json by hand. Everyone by default: the field already sits
   * behind the document's own update access.
   */
  build?: BuildGate;
  /**
   * The plugin's own global. `false` leaves the config without it — and without rich text, which
   * has nowhere left to anchor.
   */
  global?: false | JsonFormGlobalConfig;
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
    const { build = true, global = {}, richText = false, uploads = "media" } = options;
    const config: Config = { ...incoming };

    const attach = (fields: Field[]) => {
      walk(fields, (field) => {
        const own = marked(field);
        if (!own) return;
        const json = field as JSONField;
        json.admin = {
          ...json.admin,
          components: {
            ...json.admin?.components,
            Field: { path: FIELD, serverProps: { build: own.build ?? build } },
          },
        };
      });
    };

    config.collections = incoming.collections?.map((collection) => {
      attach(collection.fields);
      return collection;
    });
    config.globals = incoming.globals?.map((entry) => {
      attach(entry.fields);
      return entry;
    });

    // The plugin's own global, added the way the presets plugin adds its collection — the consumer
    // declares nothing. It carries the anchor, and whatever json forms the project wants in a global
    // of its own go in beside it rather than into a second global somebody has to write.
    let anchor = "";
    if (global !== false) {
      const { slug = GLOBAL_SLUG, label = "JSON form", fields = [], admin, ...rest } = global;
      attach(fields);
      const name = richText ? freeName(fields) : "";
      const own: GlobalConfig = {
        ...rest,
        slug,
        label,
        admin: { hidden: fields.length === 0, ...admin },
        fields: richText && name ? [...fields, anchorField(name, richText.editor)] : fields,
      };
      config.globals = [...(config.globals ?? []), own];
      // `global.` is not decoration: Payload reads a schema path as exactly three parts —
      // `[entityType, entitySlug, ...fieldPath]`, so the field is never found without it.
      if (name) anchor = `global.${slug}.${name}`;
    }

    const client: JsonFormClientConfig = {
      anchor,
      holds: richText ? (richText.holds ?? {}) : {},
      uploads,
    };
    config.admin = { ...config.admin, custom: { ...config.admin?.custom, [CONFIG_KEY]: client } };

    return config;
  };
