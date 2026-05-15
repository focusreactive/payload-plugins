import { payloadGlobalAdapter } from "@focus-reactive/payload-plugin-ab/adapters/payload-global";

import { getServerSideURL } from "../getURL";
// import { vercelEdgeAdapter } from '@focus-reactive/payload-plugin-ab/adapters/vercel-edge'
import type { ABVariantData } from "./types";

export const abAdapter = payloadGlobalAdapter<ABVariantData>({
  serverURL: getServerSideURL(),
});

// export const abAdapter = vercelEdgeAdapter<ABVariantData>({
//   configID: process.env.EDGE_CONFIG_ID!,
//   configURL: process.env.EDGE_CONFIG!,
//   vercelRestAPIAccessToken: process.env.VERCEL_REST_API_ACCESS_TOKEN!,
//   teamID: process.env.VERCEL_TEAM_ID,
// })
