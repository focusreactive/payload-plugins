import type { SanitizedConfig } from "payload";

import type { RelationsGraphOptions, ResolvedRelationsGraphOptions } from "../types.js";
import { CUSTOM_KEY, DEFAULT_VIEW_PATH } from "./constants.js";

export const resolveOptions = (options: RelationsGraphOptions): ResolvedRelationsGraphOptions => ({
  access: options.access ?? (({ req }) => Boolean(req.user)),
  exclude: options.exclude ?? [],
  includeGlobals: options.includeGlobals ?? true,
  includeHidden: options.includeHidden ?? false,
  insights: options.insights ?? true,
  navLink: options.navLink ?? true,
  path: options.path ?? DEFAULT_VIEW_PATH,
  references: options.references ?? true,
});

/** Read the options back from the config; server-side only (`custom` never reaches the client). */
export const getOptions = (config: SanitizedConfig): ResolvedRelationsGraphOptions => {
  const stored = config.custom?.[CUSTOM_KEY] as ResolvedRelationsGraphOptions | undefined;
  return stored ?? resolveOptions({});
};
