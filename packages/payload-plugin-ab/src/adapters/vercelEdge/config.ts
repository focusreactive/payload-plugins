export interface VercelEdgeAdapterConfig {
  configID: string;
  configURL: string;
  vercelRestAPIAccessToken: string;
  teamID?: string;
  /** Top-level key in Edge Config that holds the manifest. Default: 'ab-testing' */
  manifestKey?: string;
}
