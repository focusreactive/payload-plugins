import type { Config, Endpoint } from "payload";

import type { ResolvedRelationsGraphOptions } from "../../types.js";

/** REST endpoints of the "where is this used?" feature. */
export const referencesEndpoints = (_options: ResolvedRelationsGraphOptions): Endpoint[] => [];

/** Adds the "where is this used?" control to document edit views. */
export const withReferencesUI = (config: Config, _options: ResolvedRelationsGraphOptions): Config =>
  config;
