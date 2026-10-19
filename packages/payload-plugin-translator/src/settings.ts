import { TranslatorConfigError } from "./core/errors/index.js";
import { normalizePath } from "./server/shared/index.js";

import type { TargetSelectionMode } from "./types/TargetSelection.js";

/**
 * The plugin options that resolve to a value rather than wire a dependency. They are declared here,
 * beside the resolved shape and the defaults, so one setting is one place to edit.
 * {@link TranslatorPluginConfig} composes them into the public option type.
 */
export type TranslatorSettingsOptions = {
  /**
   * Base path for all translation API endpoints.
   * Useful to avoid conflicts with existing routes.
   * @example '/my-translate' results in '/my-translate/enqueue', '/my-translate/run/:id', etc.
   * @default '/translate'
   */
  basePath?: string;
  /**
   * How far back (ms) the collection panel counts failures. Work still in flight is listed however
   * old.
   * @default 259200000 (3 days)
   * @since 0.17.0
   */
  failedWindowMs?: number;
  /**
   * How the target-language field behaves in the translation forms. `'single'` (default) keeps
   * today's one-locale-per-run behaviour, byte-identical. `'multi'` renders a compact multi-select so
   * an editor can queue several target locales in one run — the run fans out one translation per
   * `(document × target locale)`. Opt-in and fully backward-compatible; no schema, no migration.
   * @default 'single'
   * @since 0.10.0
   */
  targetSelection?: TargetSelectionMode;
};

/**
 * {@link TranslatorSettingsOptions} after defaults and normalisation, as every layer below
 * `plugin.ts` sees them. The levels, the route bundle and the admin panel read these; the layers
 * between relay the whole value without naming a field.
 */
export type TranslatorSettings = {
  basePath: string;
  failedWindowMs: number;
  targetSelection: TargetSelectionMode;
};

export const DEFAULT_BASE_PATH = "/translate";
export const DEFAULT_FAILED_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
export const DEFAULT_TARGET_SELECTION: TargetSelectionMode = "single";

const failedWindowOf = (failedWindowMs: number | undefined): number => {
  const resolved = failedWindowMs ?? DEFAULT_FAILED_WINDOW_MS;
  if (!Number.isFinite(resolved) || resolved < 0) {
    throw new TranslatorConfigError(
      `[payload-plugin-translator] failedWindowMs must be a non-negative finite number (got ${resolved})`
    );
  }
  return resolved;
};

export const resolveSettings = (options: TranslatorSettingsOptions): TranslatorSettings => ({
  basePath: normalizePath(options.basePath ?? DEFAULT_BASE_PATH),
  failedWindowMs: failedWindowOf(options.failedWindowMs),
  targetSelection: options.targetSelection ?? DEFAULT_TARGET_SELECTION,
});
