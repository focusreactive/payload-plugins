import type { MCPAccessSettings, MCPPluginConfig } from "@payloadcms/plugin-mcp";
import type { PayloadRequest } from "payload";

import type { PayloadMcpApiKey } from "@/payload-types";

import { actAs, auditActorOfApiKey, LOCAL_DEV_MCP_AUDIT_ACTOR } from "./auditActor";
import { LOCAL_DEV_MCP_USER, LOCAL_HOSTS } from "./constants/local";

function isLocalDevMcpRequest(req: PayloadRequest) {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  if (process.env.PAYLOAD_MCP_LOCAL_AUTH_BYPASS === "false") {
    return false;
  }

  try {
    if (!req.url) {
      return false;
    }

    const url = new URL(req.url);

    return LOCAL_HOSTS.includes(url.hostname);
  } catch {
    const host = req.headers.get("host")?.split(":")[0];

    if (!host) {
      return false;
    }

    return LOCAL_HOSTS.includes(host);
  }
}

const LOCAL_DEV_MCP_ACCESS_SETTINGS: MCPAccessSettings = {
  authors: { create: true, delete: true, find: false, update: true },
  categories: { create: true, delete: true, find: false, update: true },
  footer: { create: true, delete: true, find: false, update: true },
  header: { create: true, delete: true, find: false, update: true },
  media: { create: true, delete: true, find: false, update: true },
  page: { create: true, delete: true, find: false, update: true },
  "payload-mcp-tool": {
    getAllDocuments: true,
    getDocument: true,
    getField: true,
    getGlobalDocument: true,
    uploadImage: true,
  },
  posts: { create: true, delete: true, find: false, update: true },
  siteSettings: { find: false, update: true },
  testimonials: { create: true, delete: true, find: false, update: true },
  users: { create: true, delete: true, find: false, update: true },
  user: LOCAL_DEV_MCP_USER,
};

export const overrideAuth: NonNullable<MCPPluginConfig["overrideAuth"]> = async (
  req,
  getDefaultMcpAccessSettings
) => {
  if (!isLocalDevMcpRequest(req)) {
    const apiKey = (await getDefaultMcpAccessSettings()) as MCPAccessSettings & PayloadMcpApiKey;
    actAs(req, auditActorOfApiKey(apiKey));
    return apiKey;
  }

  actAs(req, LOCAL_DEV_MCP_AUDIT_ACTOR);
  return LOCAL_DEV_MCP_ACCESS_SETTINGS;
};
