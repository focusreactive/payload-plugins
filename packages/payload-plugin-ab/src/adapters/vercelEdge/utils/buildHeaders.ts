import type { VercelEdgeAdapterConfig } from "../config";

export function buildHeaders(config: VercelEdgeAdapterConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.vercelRestAPIAccessToken}`,
  };
}
