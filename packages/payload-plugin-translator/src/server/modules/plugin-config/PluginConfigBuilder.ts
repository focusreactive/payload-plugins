import type { CollectionConfig, Config, Endpoint } from "payload";

import type { AccessGuard } from "../../../types/AccessGuard.js";
import type { RawPayloadComponentExport } from "../../../types/PayloadComponentExport.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { ConfigModifier } from "../../../types/ConfigModifier.js";
import type { TranslationProvider } from "../../../core/domain/translation-providers/index.js";
import type { TaskRunnerFactory } from "../task-runner/index.js";
import type { TranslatorSettings } from "../../../settings.js";

import type {
  CollectionAdminSlot,
  ComponentContext,
  ModuleContext,
  ConfigTimeContext,
} from "./types.js";

type CollectionComponent = {
  slot: CollectionAdminSlot;
  make: (collection: CollectionConfig) => RawPayloadComponentExport;
};

export type PluginConfigBuilderDeps = ConfigTimeContext;

const endpointKey = (endpoint: Endpoint): string => `${endpoint.method} ${endpoint.path}`;

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

/** The only place that mutates the Payload `config`; modules and components merely describe contributions. */
export class PluginConfigBuilder implements ComponentContext, ModuleContext {
  readonly collections: CollectionConfig[];
  readonly settings: TranslatorSettings;
  readonly access: AccessGuard;
  readonly taskRunnerFactory: TaskRunnerFactory;
  readonly schemaMap: CollectionSchemaMap;
  readonly translationProvider: TranslationProvider;

  private readonly endpoints: Endpoint[] = [];
  private readonly collectionComponents: CollectionComponent[] = [];
  private readonly adminProviders: RawPayloadComponentExport[] = [];
  private readonly configModifiers: ConfigModifier[] = [];

  constructor(deps: PluginConfigBuilderDeps) {
    this.collections = deps.collections;
    this.settings = deps.settings;
    this.access = deps.access;
    this.taskRunnerFactory = deps.taskRunnerFactory;
    this.schemaMap = deps.schemaMap;
    this.translationProvider = deps.translationProvider;
  }

  addEndpoints(endpoints: Endpoint[]): void {
    this.endpoints.push(...endpoints);
  }

  addCollectionComponent(
    slot: CollectionAdminSlot,
    make: (collection: CollectionConfig) => RawPayloadComponentExport
  ): void {
    this.collectionComponents.push({ slot, make });
  }

  /** Register a global admin provider (e.g. the client cache provider). */
  addAdminProvider(provider: RawPayloadComponentExport): void {
    this.adminProviders.push(provider);
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
    this.registerEndpoints(result);
    return result;
  }

  private attachAdminProviders(config: Config): void {
    if (this.adminProviders.length === 0) return;
    if (!config.admin) config.admin = {};
    if (!config.admin.components) config.admin.components = {};
    if (!config.admin.components.providers) config.admin.components.providers = [];
    config.admin.components.providers.push(...this.adminProviders);
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

  private registerEndpoints(config: Config): void {
    if (this.endpoints.length === 0) return;
    if (!config.endpoints) config.endpoints = [];

    const seen = new Set(config.endpoints.map(endpointKey));
    for (const endpoint of this.endpoints) {
      const key = endpointKey(endpoint);
      if (seen.has(key)) continue;
      seen.add(key);
      config.endpoints.push(endpoint);
    }
  }
}
