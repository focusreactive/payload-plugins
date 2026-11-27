import type { CollectionConfig, Config, Endpoint, Field } from "payload";

import type { AccessGuard } from "../../../types/AccessGuard.js";
import type { RawPayloadComponentExport } from "../../../types/PayloadComponentExport.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { LanguageTable } from "../../../traversal/index.js";
import type { ConfigModifier } from "../../../types/ConfigModifier.js";
import type { TranslationProvider } from "../../../core/domain/translation-providers/index.js";
import type { TaskRunnerFactory } from "../task-runner/index.js";
import type { RunRecordStoreFactory } from "../runs/index.js";
import type { TranslatorSettings } from "../../../settings.js";

import { CollectionFieldClashError } from "./errors/CollectionFieldClashError.js";
import { DuplicateEndpointError } from "./errors/DuplicateEndpointError.js";
import { routeKey } from "./routeKey.js";
import type { RouteKey } from "./routeKey.js";
import type {
  CollectionAdminSlot,
  ComponentContext,
  ModuleContext,
  ConfigTimeContext,
  ProvenanceAccess,
} from "./types.js";

/** What a provider made last may read: the config every modifier has written, and the plugin's own routes. */
type AppliedConfig = {
  config: Config;
  endpoints: readonly Endpoint[];
};

type MakeAdminProvider = (applied: AppliedConfig) => RawPayloadComponentExport;

type CollectionComponent = {
  slot: CollectionAdminSlot;
  make: (collection: CollectionConfig) => RawPayloadComponentExport;
};

export type PluginConfigBuilderDeps = ConfigTimeContext;

/** `serverProps` is left out, so the same control registered twice collapses to one. */
const componentKey = (slot: CollectionAdminSlot, component: RawPayloadComponentExport): string =>
  `${slot} ${component.path}#${component.exportName ?? ""}`;

function attachToSlot(
  collection: CollectionConfig,
  slot: CollectionAdminSlot,
  component: RawPayloadComponentExport
): void {
  if (!collection.admin) collection.admin = {};
  if (!collection.admin.components) collection.admin.components = {};
  const components = collection.admin.components;

  if (slot === "beforeDocumentControls") {
    if (!components.edit) components.edit = {};
    if (!components.edit.beforeDocumentControls) components.edit.beforeDocumentControls = [];
    components.edit.beforeDocumentControls.push(component);
    return;
  }

  if (slot === "beforeListTable") {
    if (!components.beforeListTable) components.beforeListTable = [];
    components.beforeListTable.push(component);
    return;
  }

  slot satisfies never;
}

/** Top level only: a clash inside a row or an unnamed tab is refused by Payload's own sanitizing. */
const hasFieldNamed = (collection: CollectionConfig, name: string): boolean =>
  collection.fields.some((field) => "name" in field && field.name === name);

/** Stamped on every field the plugin adds, so a second application to the same collection objects recognises its own. */
const PLUGIN_FIELD_MARK = "translatorKitField";

const isPluginField = (collection: CollectionConfig, name: string): boolean =>
  collection.fields.some(
    (field) => "name" in field && field.name === name && field.custom?.[PLUGIN_FIELD_MARK] === true
  );

/** The only place that mutates the Payload `config`; modules and components merely describe contributions. */
export class PluginConfigBuilder implements ComponentContext, ModuleContext {
  readonly collections: CollectionConfig[];
  readonly settings: TranslatorSettings;
  readonly access: AccessGuard;
  readonly taskRunnerFactory: TaskRunnerFactory;
  readonly runRecordStoreFactory: RunRecordStoreFactory;
  readonly provenance?: ProvenanceAccess;
  readonly schemaMap: CollectionSchemaMap;
  readonly translationProvider: TranslationProvider;
  readonly walk: LanguageTable;

  private readonly endpoints: Endpoint[] = [];
  private readonly endpointKeys = new Set<RouteKey>();
  private readonly collectionComponents: CollectionComponent[] = [];
  private readonly collectionFields: (() => Field)[] = [];
  private readonly adminProviders: MakeAdminProvider[] = [];
  private readonly configModifiers: ConfigModifier[] = [];

  constructor(deps: PluginConfigBuilderDeps) {
    this.collections = deps.collections;
    this.settings = deps.settings;
    this.access = deps.access;
    this.taskRunnerFactory = deps.taskRunnerFactory;
    this.runRecordStoreFactory = deps.runRecordStoreFactory;
    this.provenance = deps.provenance;
    this.schemaMap = deps.schemaMap;
    this.translationProvider = deps.translationProvider;
    this.walk = deps.walk;
  }

  addEndpoints(endpoints: Endpoint[]): void {
    for (const endpoint of endpoints) {
      const key = routeKey(endpoint);
      if (this.endpointKeys.has(key)) throw new DuplicateEndpointError(key);
      this.endpointKeys.add(key);
      this.endpoints.push(endpoint);
    }
  }

  addCollectionComponent(
    slot: CollectionAdminSlot,
    make: (collection: CollectionConfig) => RawPayloadComponentExport
  ): void {
    this.collectionComponents.push({ slot, make });
  }

  addCollectionField(make: () => Field): void {
    this.collectionFields.push(make);
  }

  /** Register a global admin provider (e.g. the client cache provider). */
  addAdminProvider(make: MakeAdminProvider): void {
    this.adminProviders.push(make);
  }

  /** Register a config modifier (e.g. the runner's jobs/autorun/onInit setup). */
  addConfigModifier(modifier: ConfigModifier): void {
    this.configModifiers.push(modifier);
  }

  /** The one sink that writes every accumulated contribution into `config`. */
  applyTo(config: Config): Config {
    let result = config;
    for (const modify of this.configModifiers) result = modify(result);

    this.attachAdminProviders(result);
    this.attachCollectionComponents(result);
    this.attachCollectionFields(result);
    this.registerEndpoints(result);
    return result;
  }

  private attachAdminProviders(config: Config): void {
    if (this.adminProviders.length === 0) return;
    if (!config.admin) config.admin = {};
    if (!config.admin.components) config.admin.components = {};
    if (!config.admin.components.providers) config.admin.components.providers = [];
    const applied: AppliedConfig = { config, endpoints: this.endpoints };
    config.admin.components.providers.push(...this.adminProviders.map((make) => make(applied)));
  }

  private attachCollectionComponents(config: Config): void {
    if (this.collectionComponents.length === 0) return;
    const managed = new Set(this.collections.map((collection) => collection.slug));
    config.collections?.forEach((collection) => {
      if (!managed.has(collection.slug)) return;
      const seenOnThisCollection = new Set<string>();
      for (const { slot, make } of this.collectionComponents) {
        const component = make(collection);
        const key = componentKey(slot, component);
        if (seenOnThisCollection.has(key)) continue;
        seenOnThisCollection.add(key);
        attachToSlot(collection, slot, component);
      }
    });
  }

  private attachCollectionFields(config: Config): void {
    if (this.collectionFields.length === 0) return;
    const managed = new Set(this.collections.map((collection) => collection.slug));
    config.collections?.forEach((collection) => {
      if (!managed.has(collection.slug)) return;
      for (const make of this.collectionFields) {
        const field = make();
        if ("name" in field && isPluginField(collection, field.name)) continue;
        if ("name" in field && hasFieldNamed(collection, field.name)) {
          throw new CollectionFieldClashError(collection.slug, field.name);
        }
        collection.fields.push({
          ...field,
          custom: { ...field.custom, [PLUGIN_FIELD_MARK]: true },
        });
      }
    });
  }

  private registerEndpoints(config: Config): void {
    if (this.endpoints.length === 0) return;
    if (!config.endpoints) config.endpoints = [];

    const hostRoutes = new Set(config.endpoints.map(routeKey));
    for (const endpoint of this.endpoints) {
      if (hostRoutes.has(routeKey(endpoint))) continue;
      config.endpoints.push(endpoint);
    }
  }
}
