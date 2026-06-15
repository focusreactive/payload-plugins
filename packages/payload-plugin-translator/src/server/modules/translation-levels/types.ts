import type { CollectionConfig, Endpoint } from "payload";

import type { AccessGuard } from "../../../types/AccessGuard";
import type { RawPayloadComponentExport } from "../../../client/shared/types/PayloadComponentExport";
import type { CollectionSchemaMap } from "../../features/translate-document";
import type { TranslationProvider } from "../translation-providers";
import type { TaskRunnerFactory } from "../task-runner";

export type CollectionAdminSlot = "beforeDocumentControls" | "beforeListTable";

/**
 * A composable translation surface (document / collection / field).
 *
 * Treat it as an **opaque value**: create one with `documentLevel()` /
 * `collectionLevel()` (and, later, `fieldLevel()`) and list it in
 * `translatorPlugin({ levels })`. It is produced only by those built-in
 * factories — not externally implementable yet, since {@link LevelContext} is
 * intentionally not exported. Opening it later (export `LevelContext`, drop the
 * `@internal` tag) is additive and non-breaking.
 *
 * @since 0.5.0
 */
export interface TranslationLevel {
  /**
   * Not a stable contract yet — produce via the level factories.
   * @internal
   */
  extend(ctx: LevelContext): void;
}

/**
 * Public-ready shape, kept internal until external levels are needed.
 *
 * A level contributes via these generic primitives; it never mutates the raw
 * Payload config. The plugin deduplicates endpoints by method + path on apply.
 * @internal
 */
export interface LevelContext {
  readonly collections: CollectionConfig[];
  readonly basePath: string;
  readonly access?: AccessGuard;
  readonly taskRunnerFactory: TaskRunnerFactory;
  /** Deep-cloned localized field schema per managed collection slug. */
  readonly schemaMap: CollectionSchemaMap;
  /** The configured translation backend (used by the synchronous field level). */
  readonly translationProvider: TranslationProvider;

  /** Register endpoints. Deduplicated by method + path when applied. */
  addEndpoints(endpoints: Endpoint[]): void;
  /** Attach an admin component to a slot on every managed collection. */
  addCollectionComponent(slot: CollectionAdminSlot, make: (collection: CollectionConfig) => RawPayloadComponentExport): void;
}
