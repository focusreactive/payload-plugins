import type { Config, Field, GlobalConfig, JSONField, Plugin, RichTextField } from "payload";
import { anchorField } from "./field/anchorField.js";
import { jsonLibraryField } from "./library/jsonLibraryField.js";
import type { JsonLibraryOptions } from "./library/jsonLibraryField.js";
import { MARKER } from "./field/index.js";
import type { BuildGate, Mark } from "./field/index.js";
import type { Holds } from "./field/htmlToLexical.js";
import { CONFIG_KEY } from "./config.js";
import type { JsonFormClientConfig } from "./config.js";

const FIELD = "@focus-reactive/payload-plugin-json-form-builder/rsc#JsonFormField";
const ANCHOR_NAME = "jsonFormAnchor";
const GLOBAL_SLUG = "json-form";

export type JsonFormGlobalConfig = {
  slug?: string;
  label?: GlobalConfig["label"];
  access?: GlobalConfig["access"];
  admin?: GlobalConfig["admin"];
  hooks?: GlobalConfig["hooks"];
  fields?: Field[];
};

export type JsonFormPluginConfig = {
  build?: BuildGate;
  global?: false | JsonFormGlobalConfig;
  library?: boolean | JsonLibraryOptions;
  richText?:
    | false
    | {
        editor: RichTextField["editor"];
        holds?: Holds;
      };
  uploads?: false | string;
};

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
  field.type === "json" ? ((field.custom?.[MARKER] ?? null) as Mark | null) : null;

const freeName = (fields: Field[]) => {
  const taken = new Set(fields.map((field) => ("name" in field ? field.name : "")));
  let name = ANCHOR_NAME;
  for (let n = 2; taken.has(name); n++) name = `${ANCHOR_NAME}${n}`;
  return name;
};

export const jsonFormPlugin =
  (options: JsonFormPluginConfig = {}): Plugin =>
  (incoming: Config): Config => {
    const {
      build = true,
      global = {},
      library: wanted = false,
      richText = false,
      uploads = "media",
    } = options;
    const config: Config = { ...incoming };

    let library: JsonFormClientConfig["library"] = null;

    const attach = (fields: Field[], global = "") => {
      walk(fields, (field) => {
        const own = marked(field);
        if (!own) return;
        if (own.library && "name" in field) {
          if (library) {
            console.warn(
              `[json-form-builder] the library field is mounted more than once; keeping global.${library.global}.${library.field}`
            );
          } else if (global) {
            library = { global, field: field.name };
          } else {
            console.warn(
              "[json-form-builder] the library field belongs in a global; this one is ignored"
            );
          }
        }
        const json = field as JSONField;
        json.admin = {
          ...json.admin,
          components: {
            ...json.admin?.components,
            Field: {
              path: FIELD,
              serverProps: { build: own.build ?? build, library: Boolean(own.library) },
            },
          },
        };
      });
    };

    config.collections = incoming.collections?.map((collection) => {
      attach(collection.fields);
      return collection;
    });
    config.globals = incoming.globals?.map((entry) => {
      attach(entry.fields, entry.slug);
      return entry;
    });

    let anchor = "";
    if (global !== false) {
      const {
        slug = GLOBAL_SLUG,
        label = "JSON form",
        fields: declared = [],
        admin,
        ...rest
      } = global;
      const fields = wanted
        ? [...declared, jsonLibraryField(wanted === true ? {} : wanted)]
        : declared;
      attach(fields, slug);
      const name = richText ? freeName(fields) : "";
      const mine: GlobalConfig = {
        ...rest,
        slug,
        label,
        admin: { hidden: fields.length === 0, ...admin },
        fields: richText && name ? [...fields, anchorField(name, richText.editor)] : fields,
      };
      config.globals = [...(config.globals ?? []), mine];
      // Payload reads a schema path as exactly three parts: `[entityType, entitySlug, ...field]`.
      if (name) anchor = `global.${slug}.${name}`;
    }

    const client: JsonFormClientConfig = {
      anchor,
      holds: richText ? (richText.holds ?? {}) : {},
      library,
      uploads,
    };
    config.admin = { ...config.admin, custom: { ...config.admin?.custom, [CONFIG_KEY]: client } };

    return config;
  };
