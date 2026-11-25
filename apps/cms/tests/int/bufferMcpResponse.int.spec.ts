import type { Config, Endpoint, PayloadRequest } from "payload";
import { describe, expect, it } from "vitest";

import { bufferMcpResponse } from "@/lib/plugins/mcp/bufferMcpResponse";

const streamingHandler =
  (events: string[]): Endpoint["handler"] =>
  () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        events.push("tool finished");
        controller.enqueue(encoder.encode("data: done\n\n"));
        controller.close();
      },
    });

    return new Response(body, { headers: { "content-type": "text/event-stream" }, status: 200 });
  };

const applyPlugin = async (endpoints: Endpoint[]) =>
  (await bufferMcpResponse({ endpoints } as Config)).endpoints ?? [];

describe("bufferMcpResponse", () => {
  it("resolves the MCP POST handler only after the streamed tool output is complete", async () => {
    const events: string[] = [];
    const [endpoint] = await applyPlugin([
      { handler: streamingHandler(events), method: "post", path: "/mcp" },
    ]);

    const response = await endpoint.handler({} as PayloadRequest);
    events.push("handler returned");

    expect(events).toEqual(["tool finished", "handler returned"]);
    expect(await response.text()).toBe("data: done\n\n");
    expect(response.headers.get("content-type")).toBe("text/event-stream");
  });

  it("leaves other endpoints untouched", async () => {
    const handler = streamingHandler([]);
    const [getEndpoint, otherEndpoint] = await applyPlugin([
      { handler, method: "get", path: "/mcp" },
      { handler, method: "post", path: "/other" },
    ]);

    expect(getEndpoint.handler).toBe(handler);
    expect(otherEndpoint.handler).toBe(handler);
  });
});
