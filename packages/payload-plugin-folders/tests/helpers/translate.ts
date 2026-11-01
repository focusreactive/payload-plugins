import { de } from "../../src/translations/de.js";
import { en } from "../../src/translations/en.js";
import type { Translate } from "../../src/admin/compat.js";

type Table = Record<string, string>;

/**
 * The admin's `translate` over one of the plugin's own tables: the plural suffix Payload picks
 * (`_one` for 1, `_other` otherwise) and `{{name}}` filled in, so a unit test reads the real strings.
 */
export const translateWith =
  (language: "de" | "en"): Translate =>
  (key, variables = {}) => {
    const table = (language === "de" ? de : en).foldersTree as Table;
    const plural =
      typeof variables.count === "number" ? (variables.count === 1 ? "one" : "other") : null;
    const template = (plural && table[`${key}_${plural}`]) || table[key];
    if (template === undefined) {
      throw new Error(`No ${language} string for ${key}`);
    }

    return template.replaceAll(/\{\{(\w+)\}\}/gu, (_match, name: string) =>
      String(variables[name])
    );
  };
