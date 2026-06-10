import type { CollectionConfig, Config, Endpoint } from "payload";

import type { AccessGuard } from "../../../types/AccessGuard";
import type { RawPayloadComponentExport } from "../../../client/shared/types/PayloadComponentExport";
import type { TaskRunnerFactory } from "../task-runner";

import type { CollectionAdminSlot, LevelContext } from "./types";

type CollectionComponent = {
  slot: CollectionAdminSlot;
  make: (collection: CollectionConfig) => RawPayloadComponentExport;
};

type ConfigModifier = (config: Config) => Config;

export type PluginConfigBuilderDeps = {
  collections: CollectionConfig[];
  basePath: string;
  access?: AccessGuard;
  taskRunnerFactory: TaskRunnerFactory;
};

const endpointKey = (endpoint: Endpoint): string => `${endpoint.method} ${endpoint.path}`;

function attachToSlot(collection: CollectionConfig, slot: CollectionAdminSlot, component: RawPayloadComponentExport): void {
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

  // Exhaustiveness: a new CollectionAdminSlot must be handled above, not fall through.
  slot satisfies never;
}

/**
 * The single place that mutates the Payload `config`. Levels (through the narrow
 * {@link LevelContext}) and the plugin (through `addAdminProvider` /
 * `addConfigModifier`) only *describe* their contributions; `applyTo(config)` is
 * the one sink that writes them in. This keeps Payload's in-place-mutation style
 * — including the lazy nested-config init — confined here, so `plugin.ts` and the
 * levels stay free of direct config mutation.
 *
 * It implements {@link LevelContext}, so the same instance is what levels receive
 * as their context (they see only `addEndpoints` / `addCollectionComponent`).
 */
export class PluginConfigBuilder implements LevelContext {
  readonly collections: CollectionConfig[];
  readonly basePath: string;
  readonly access?: AccessGuard;
  readonly taskRunnerFactory: TaskRunnerFactory;

  private readonly endpoints: Endpoint[] = [];
  private readonly collectionComponents: CollectionComponent[] = [];
  private readonly adminProviders: RawPayloadComponentExport[] = [];
  private readonly configModifiers: ConfigModifier[] = [];

  constructor(deps: PluginConfigBuilderDeps) {
    this.collections = deps.collections;
    this.basePath = deps.basePath;
    this.access = deps.access;
    this.taskRunnerFactory = deps.taskRunnerFactory;
  }

  addEndpoints(endpoints: Endpoint[]): void {
    this.endpoints.push(...endpoints);
  }

  addCollectionComponent(slot: CollectionAdminSlot, make: (collection: CollectionConfig) => RawPayloadComponentExport): void {
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
    // Config modifiers first — a runner's modifier may return a fresh config
    // object, so everything else must be applied to its result.
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
    // Not deduplicated. Unlike a duplicate endpoint (a route conflict), a
    // duplicate admin provider is harmless, and providers have no reliable
    // identity key across their shapes (`string | { path } | false`, with
    // distinguishing `serverProps`). The single CacheProvider is added once per
    // plugin instance.
    config.admin.components.providers.push(...this.adminProviders);
  }

  private attachCollectionComponents(config: Config): void {
    if (this.collectionComponents.length === 0) return;
    const managed = new Set(this.collections.map((collection) => collection.slug));
    config.collections?.forEach((collection) => {
      if (!managed.has(collection.slug)) return;
      for (const { slot, make } of this.collectionComponents) {
        attachToSlot(collection, slot, make(collection));
      }
    });
  }

  private registerEndpoints(config: Config): void {
    if (this.endpoints.length === 0) return;
    if (!config.endpoints) config.endpoints = [];
    // Seed from endpoints already on the config so each (method, path) registers
    // once — across the levels' contributions AND anything already present (e.g.
    // the plugin registered twice, or a host route at the same path).
    const seen = new Set(config.endpoints.map(endpointKey));
    for (const endpoint of this.endpoints) {
      const key = endpointKey(endpoint);
      if (seen.has(key)) continue;
      seen.add(key);
      config.endpoints.push(endpoint);
    }
  }
}
