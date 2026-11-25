import type { Endpoint, Plugin } from "payload";

const isMcpPostEndpoint = (endpoint: Endpoint) =>
  endpoint.path === "/mcp" && endpoint.method === "post";

const bufferResponse =
  (handler: Endpoint["handler"]): Endpoint["handler"] =>
  async (req) => {
    const response = await handler(req);
    const body = await response.arrayBuffer();

    return new Response(body, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    });
  };

/**
 * mcp-handler resolves its Response as soon as the stream head is written, so a tool runs
 * after the route handler has returned and Next drops the revalidateTag calls of its hooks.
 * Reading the whole body first keeps the tool inside the request, so its revalidations apply.
 */
export const bufferMcpResponse: Plugin = (config) => ({
  ...config,
  endpoints: config.endpoints?.map((endpoint) =>
    isMcpPostEndpoint(endpoint)
      ? { ...endpoint, handler: bufferResponse(endpoint.handler) }
      : endpoint
  ),
});
