import { callEndpoint } from "./callEndpoint.js";
import type { TestPayload } from "./getTestPayload.js";

export type McpToolResult = {
  isError: boolean;
  structuredContent: unknown;
  text: string;
};

export type McpToolListing = {
  description: string;
  inputSchema: Record<string, unknown>;
  name: string;
};

type McpResponseBody = {
  error?: { message: string };
  result?: {
    content?: Array<{ text: string }>;
    instructions?: string;
    isError?: boolean;
    structuredContent?: unknown;
    tools?: McpToolListing[];
  };
};

const postToMcp = async (
  harness: TestPayload,
  method: string,
  params: Record<string, unknown>,
  user?: { email: string; password: string }
) => {
  const { body, status } = await callEndpoint<McpResponseBody>({
    body: { id: 1, jsonrpc: "2.0", method, params },
    config: harness.config,
    headers: { Accept: "application/json, text/event-stream" },
    method: "POST",
    path: "/mcp",
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
    user,
  });

  return { body, status };
};

/** Calls one tool through `POST /api/mcp`, signed in as the shared admin test user by default. */
export const callMcpTool = async (
  harness: TestPayload,
  name: string,
  toolArguments: Record<string, unknown> = {},
  user?: { email: string; password: string }
): Promise<McpToolResult> => {
  const { body } = await postToMcp(harness, "tools/call", { arguments: toolArguments, name }, user);
  if (!body?.result) {
    throw new Error(`MCP answered without a result: ${JSON.stringify(body)}`);
  }

  return {
    isError: Boolean(body.result.isError),
    structuredContent: body.result.structuredContent,
    text: (body.result.content ?? []).map((part) => part.text).join("\n"),
  };
};

export const listMcpTools = async (
  harness: TestPayload,
  user?: { email: string; password: string }
): Promise<McpToolListing[]> => {
  const { body } = await postToMcp(harness, "tools/list", {}, user);
  if (!body?.result?.tools) {
    throw new Error(`MCP answered without a tool list: ${JSON.stringify(body)}`);
  }

  return body.result.tools;
};

/** The HTTP status of `POST /api/mcp`, for a site where the endpoint may not exist. */
export const mcpEndpointStatus = async (harness: TestPayload): Promise<number> =>
  (await postToMcp(harness, "tools/list", {})).status;

/** The `instructions` the server returns when a client connects, or undefined when it sends none. */
export const readMcpInstructions = async (harness: TestPayload): Promise<string | undefined> => {
  const { body } = await postToMcp(harness, "initialize", {
    capabilities: {},
    clientInfo: { name: "folders-tests", version: "1.0.0" },
    protocolVersion: "2025-06-18",
  });
  if (!body?.result) {
    throw new Error(`MCP answered initialize without a result: ${JSON.stringify(body)}`);
  }

  return body.result.instructions;
};
