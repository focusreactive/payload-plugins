import type { MCPAccessSettings } from "@payloadcms/plugin-mcp";

export const LOCAL_DEV_MCP_USER: MCPAccessSettings["user"] = {
  collection: "users",
  createdAt: new Date(0).toISOString(),
  email: "local-mcp@localhost",
  id: 0,
  name: "Local MCP",
  role: "admin",
  updatedAt: new Date(0).toISOString(),
};

export const LOCAL_HOSTS = ["127.0.0.1", "::1", "localhost"];
