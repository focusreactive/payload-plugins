export interface PayloadGlobalAdapterConfig {
  /** Slug for the Payload Global that stores the manifest. Default: '_abManifest' */
  globalSlug?: string;
  /** Server URL used to fetch the global via REST in middleware. Example: 'https://example.com' */
  serverURL?: string;
  /** Payload API route prefix. Default: '/api' */
  apiRoute?: string;
}
