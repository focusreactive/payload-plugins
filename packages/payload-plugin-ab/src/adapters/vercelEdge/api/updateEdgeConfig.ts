import type { VercelEdgeAdapterConfig } from "../config";
import { buildHeaders } from "../utils/buildHeaders";

export async function updateEdgeConfig(
  config: VercelEdgeAdapterConfig,
  manifestKey: string,
  value: unknown
) {
  const teamQuery = config.teamID ? `?teamId=${config.teamID}` : "";

  await fetch(
    `https://api.vercel.com/v1/edge-config/${config.configID}/items${teamQuery}`,
    {
      body: JSON.stringify({
        items: [{ operation: "upsert", key: manifestKey, value }],
      }),
      headers: buildHeaders(config),
      method: "PATCH",
    }
  );
}
