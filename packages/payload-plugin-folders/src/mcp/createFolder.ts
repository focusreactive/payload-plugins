import type { PayloadRequest } from "payload";

import { checkSegment } from "../core/checkSegment.js";
import { badRequest } from "../core/badRequest.js";
import { readFolderRecord } from "../core/folderRecords.js";
import { getDefaultLocaleKey, getFolderLocaleKeys, noLocaleKey } from "../core/locales.js";
import { slugify } from "../core/slugify.js";
import { isEmptyText } from "../core/structureGuard.js";
import type { FolderId, ResolvedOptions } from "../types.js";
import { runTool, toolRefusal, toolSuccess } from "./toolResult.js";
import type { FoldersMcpTool, FoldersMcpToolArguments } from "./types.js";

type ValuesByLocale = Record<string, string>;

/** The locale a folder write is keyed by on this site, and the keys its name and slug take. */
type FolderKeys = { defaultKey: string; keys: string[] };

const readLocaleValues = ({
  field,
  keys,
  value,
}: {
  field: string;
  keys: string[];
  value: unknown;
}): ValuesByLocale => {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw badRequest(
      `${field} must be an object with one text per language, for example { "${keys[0]}": "Guides" }.`
    );
  }
  const values: ValuesByLocale = {};
  for (const [key, text] of Object.entries(value)) {
    if (!keys.includes(key)) {
      throw badRequest(
        `${field}: "${key}" is not a language of this site. The languages are ${keys.join(", ")}.`
      );
    }
    if (typeof text !== "string") {
      throw badRequest(`${field}.${key} must be text.`);
    }
    if (text.trim() !== "") {
      values[key] = text.trim();
    }
  }

  return values;
};

/** The slug each language ends up with: its own, or one made from its name the way the plugin does. */
const effectiveSlugs = ({
  names,
  slugs,
}: {
  names: ValuesByLocale;
  slugs: ValuesByLocale;
}): ValuesByLocale => {
  const result: ValuesByLocale = {};
  for (const key of new Set([...Object.keys(names), ...Object.keys(slugs)])) {
    const slug = slugs[key] ?? slugify(names[key] ?? "", key);
    if (slug !== "") {
      result[key] = slug;
    }
  }

  return result;
};

const readParent = (value: unknown): FolderId | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }
  throw badRequest("parent must be a folder id, or null for the top level.");
};

const refuseTakenPaths = async ({
  folderKeys,
  parent,
  req,
  slugs,
}: {
  folderKeys: FolderKeys;
  parent: FolderId | null;
  req: PayloadRequest;
  slugs: ValuesByLocale;
}): Promise<void> => {
  const problems: string[] = [];
  for (const key of folderKeys.keys) {
    const segment = slugs[key] ?? slugs[folderKeys.defaultKey];
    if (segment === undefined) {
      continue;
    }
    const check = await checkSegment(req, {
      locale: key === noLocaleKey ? undefined : key,
      parent,
      segment,
    });
    if (!check.ok) {
      problems.push(key === noLocaleKey ? `${check.message}` : `${key}: ${check.message}`);
    }
  }
  if (problems.length > 0) {
    throw badRequest(`${problems.join(". ")}. Nothing was created.`);
  }
};

const createFolder = ({
  input,
  options,
  req,
}: FoldersMcpToolArguments & { options: ResolvedOptions }) =>
  runTool(async () => {
    const { payload } = req;
    const keys = getFolderLocaleKeys(payload, options);
    const defaultKey = getDefaultLocaleKey(payload, options);
    const folderKeys = { defaultKey, keys };
    const isLocalized = !(keys.length === 1 && keys[0] === noLocaleKey);

    const names = readLocaleValues({ field: "name", keys, value: input.name });
    const slugs = readLocaleValues({ field: "slug", keys, value: input.slug });
    if (isEmptyText(names[defaultKey])) {
      return toolRefusal(
        isLocalized
          ? `name needs a value for the default language (${defaultKey}). Ask the user for the folder's name; the other languages may be left out and then show the default language's name.`
          : "name needs a value. Ask the user for the folder's name."
      );
    }
    const slugsInEffect = effectiveSlugs({ names, slugs });
    if (isEmptyText(slugsInEffect[defaultKey])) {
      return toolRefusal(
        `The name "${names[defaultKey]}" has no letters or digits to make a URL segment from. Pass slug as well.`
      );
    }

    const parent = readParent(input.parent);
    await refuseTakenPaths({ folderKeys, parent, req, slugs: slugsInEffect });

    const created = await payload.create({
      collection: options.folders.slug,
      data: isLocalized
        ? {
            name: names,
            parent,
            ...(Object.keys(slugs).length > 0 ? { slug: slugs } : {}),
          }
        : {
            name: names[noLocaleKey],
            parent,
            ...(slugs[noLocaleKey] ? { slug: slugs[noLocaleKey] } : {}),
          },
      depth: 0,
      overrideAccess: false,
      req,
      ...(isLocalized ? { locale: "all" as never } : {}),
    } as never);
    const id = (created as unknown as { id: FolderId }).id;

    const stored = await readFolderRecord(req, options, id);
    if (!stored) {
      return toolRefusal(`The folder was created as ${String(id)} but could not be read back.`);
    }
    const fullPath = Object.fromEntries(
      keys.map((key) => [key, stored.fullPath[key] || stored.fullPath[defaultKey] || ""])
    );
    const fallingBack = keys
      .filter((key) => key !== defaultKey && isEmptyText(names[key]))
      .map((key) => ({ fullPath: fullPath[key], locale: key }));
    const name = Object.fromEntries(keys.map((key) => [key, names[key] ?? null]));

    const paths = keys.map((key) =>
      `${key === noLocaleKey ? "" : `${key} `}${fullPath[key]}`.trim()
    );
    const fallbackNote =
      fallingBack.length > 0
        ? ` ${fallingBack.map((entry) => entry.locale).join(", ")} ${fallingBack.length === 1 ? "has" : "have"} no name of ${fallingBack.length === 1 ? "its" : "their"} own and show${fallingBack.length === 1 ? "s" : ""} the ${defaultKey} name at the ${defaultKey} path. If the user wants a name there, ask for it.`
        : "";

    return toolSuccess(
      `Created folder ${String(id)} "${names[defaultKey]}". Paths: ${paths.join("; ")}.${fallbackNote}`,
      { fallingBack, fullPath, id, name, parent }
    );
  });

export const buildCreateFolderTool = (
  options: ResolvedOptions,
  folderKeys: FolderKeys
): FoldersMcpTool => {
  const textPerLanguage = Object.fromEntries(
    folderKeys.keys.map((key) => [key, { type: "string" }])
  );

  return {
    access: ({ req }) => Boolean(req.user),
    annotations: {
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
      readOnlyHint: false,
      title: "Create a folder",
    },
    description: `Creates a folder in the content tree, with its name in every language in one step. Use it when the user asks for a new folder. Creating a folder changes no existing URL.

A folder has a name and a URL segment (slug) per language. Ask the user for the name in each language of the site, or tell them that a language left out will show the default language's name and URL (fallback), and let them choose. Do not translate a name yourself unless the user asked you to. The default language (${folderKeys.defaultKey}) is required. If you give no slug, one is made from the name.

Pass parent as the id of the folder to create it in, or null for the top level; use browseTree to find folder ids. If the URL path is already taken in any language, nothing is created and the answer says which path. The tool returns the new id, the full URL path in every language read back after the write, and fallingBack, the languages without a name of their own with the path each shows. You can only create where your own account may.`,
    handler: ({ input, req }) =>
      createFolder({ input: input as Record<string, unknown>, options, req }),
    input: {
      additionalProperties: false,
      properties: {
        name: {
          additionalProperties: false,
          description: `The folder's name, one text per language. ${folderKeys.defaultKey} is required.`,
          properties: textPerLanguage,
          required: [folderKeys.defaultKey],
          type: "object",
        },
        parent: {
          description: "The id of the folder to create it in. null or left out is the top level.",
          type: ["integer", "string", "null"],
        },
        slug: {
          additionalProperties: false,
          description:
            "The URL segment, one per language, lowercase letters, digits and hyphens. Leave out to make it from the name.",
          properties: textPerLanguage,
          type: "object",
        },
      },
      required: ["name"],
      type: "object",
    },
  };
};
