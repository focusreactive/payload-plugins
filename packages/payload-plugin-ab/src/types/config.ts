import type { GlobalConfig, Payload } from "payload";

export interface StorageAdapter<TVariantData extends object = object> {
  write(path: string, variants: TVariantData[], payload: Payload): Promise<void>;
  read(path: string): Promise<TVariantData[] | null>;
  clear(path: string, payload: Payload): Promise<void>;
  createGlobal?(debug: boolean): GlobalConfig;
}

export interface CollectionABConfig<TVariantData extends object = object> {
  /**
   * Dot-notation path to the slug field on the document.
   * Used to generate the cloned variant's slug: `{slug}--{nanoid}`.
   * Default: 'slug'
   */
  slugField?: string;
  /**
   * Optional dot-notation path to the tenant field on the document.
   * When set, the field is hidden on variant documents to prevent mismatches.
   */
  tenantField?: string;
  /**
   * Maps a document to the URL path used as the manifest key.
   * Return null to skip writing the manifest for that document.
   * Called once per locale when localization is enabled.
   */
  generatePath: (args: { doc: Record<string, unknown>; locale: string | undefined }) => string | null;
  /**
   * Builds the data stored per variant in the manifest.
   * When omitted, auto-generates: { bucket: variantSlug, rewritePath: generatePath(variantDoc), passPercentage: _abPassPercentage }
   */
  generateVariantData?: (args: {
    doc: Record<string, unknown>;
    variantDoc: Record<string, unknown>;
    locale: string | undefined;
  }) => TVariantData;
}

export interface AbTestingPluginConfig<TVariantData extends object = object> {
  /** Default: true */
  enabled?: boolean;
  /** If true, the manifest global is visible in the Payload admin panel. Default: false */
  debug?: boolean;
  /** Map of parent collection slug => A/B config for that collection. */
  collections: Record<string, CollectionABConfig<TVariantData>>;
  /** Storage adapter instance. */
  storage: StorageAdapter<TVariantData>;
}
