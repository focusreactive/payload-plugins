import type { CollectionConfig, Endpoint } from "payload";

import type { AccessGuard } from "../../../types/AccessGuard.js";
import type { ConfigModifier } from "../../../types/ConfigModifier.js";
import type { RawPayloadComponentExport } from "../../../types/PayloadComponentExport.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { TranslationProvider } from "../../../core/domain/translation-providers/index.js";
import type { TaskRunnerFactory } from "../task-runner/index.js";
import type { ChainMember } from "../translation-run/index.js";
import type { TranslatorSettings } from "../../../settings.js";

export type CollectionAdminSlot = "beforeDocumentControls" | "beforeListTable";

export type ConfigTimeContext = {
  readonly collections: CollectionConfig[];
  readonly settings: TranslatorSettings;
  readonly access: AccessGuard;
  readonly taskRunnerFactory: TaskRunnerFactory;
  readonly schemaMap: CollectionSchemaMap;
  readonly translationProvider: TranslationProvider;
};

/**
 * What a module may contribute while the config is being built.
 * @internal
 */
export interface ModuleContext extends ConfigTimeContext {
  /** Deduplicated by method + path when applied. */
  addEndpoints(endpoints: Endpoint[]): void;
  addConfigModifier(modifier: ConfigModifier): void;
}

/**
 * What an admin component may contribute: a slot on each managed collection, nothing on the server.
 * @internal
 */
export interface ComponentContext extends ConfigTimeContext {
  addCollectionComponent(
    slot: CollectionAdminSlot,
    make: (collection: CollectionConfig) => RawPayloadComponentExport
  ): void;
}

/**
 * Create one with a built-in factory and list it in `translatorPlugin({ modules })`; writing your own
 * is not supported yet.
 *
 * @since 1.0.0
 */
export interface TranslationModule extends ChainMember {
  setup?(ctx: ModuleContext): void;
}

/**
 * An admin control the plugin attaches to every managed collection.
 *
 * @since 1.0.0
 */
export interface TranslationComponent {
  attach(ctx: ComponentContext): void;
}
