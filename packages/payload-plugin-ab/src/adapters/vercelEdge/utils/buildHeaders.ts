import type { VercelEdgeAdapterConfig } from "../config";

export function buildHeaders(
  config: VercelEdgeAdapterConfig
): Record<string, string> {
  return {
    Authorization: `Bearer ${config.vercelRestAPIAccessToken}`,
    "Content-Type": "application/json",
  };
}
