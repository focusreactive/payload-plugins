import { describe, it, expect, vi, beforeEach } from "vitest";
import { APIError } from "payload";
import { markFailureReason } from "../../../../core/domain/translation-providers/failureReason.js";
import type { PayloadRequest } from "payload";

import { withErrorHandler } from "../withErrorHandler.js";
import { ServerResponse } from "../ServerResponse.js";

const req = { headers: new Headers() } as unknown as PayloadRequest;

describe("withErrorHandler", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns handler result on success", async () => {
    const expectedResponse = ServerResponse.success({ data: "test" });
    const handler = vi.fn().mockResolvedValue(expectedResponse);

    const wrappedHandler = withErrorHandler(handler);
    const result = await wrappedHandler(req);

    expect(result).toBe(expectedResponse);
  });

  it("hands the handler the request it was called with", async () => {
    const handler = vi.fn().mockResolvedValue(ServerResponse.success());

    await withErrorHandler(handler)(req);

    expect(handler).toHaveBeenCalledWith(req);
  });

  it("handles APIError with custom status", async () => {
    const apiError = new APIError("Not found", 404);
    const handler = vi.fn().mockRejectedValue(apiError);

    const wrappedHandler = withErrorHandler(handler);
    const result = await wrappedHandler(req);

    expect(result.status).toBe(404);
    expect(await result.json()).toEqual({ message: "Not found" });
  });

  it("handles APIError with different statuses", async () => {
    const badRequestError = new APIError("Bad request data", 400);
    const handler = vi.fn().mockRejectedValue(badRequestError);

    const wrappedHandler = withErrorHandler(handler);
    const result = await wrappedHandler(req);

    expect(result.status).toBe(400);
    expect(await result.json()).toEqual({ message: "Bad request data" });
  });

  it("handles generic Error with 500 status", async () => {
    const error = new Error("Something went wrong");
    const handler = vi.fn().mockRejectedValue(error);

    const wrappedHandler = withErrorHandler(handler);
    const result = await wrappedHandler(req);

    expect(result.status).toBe(500);
    expect(await result.json()).toEqual({ message: "Something went wrong" });
  });

  it("handles unknown error with default message", async () => {
    const handler = vi.fn().mockRejectedValue("string error");

    const wrappedHandler = withErrorHandler(handler);
    const result = await wrappedHandler(req);

    expect(result.status).toBe(500);
    expect(await result.json()).toEqual({ message: "Internal server error" });
  });

  it("logs error to console", async () => {
    const error = new Error("Test error");
    const handler = vi.fn().mockRejectedValue(error);

    const wrappedHandler = withErrorHandler(handler);
    await wrappedHandler(req);

    expect(console.error).toHaveBeenCalledWith("[TranslateKit] Handler error:", error);
  });

  it("hands back the handler's own response, not a copy", async () => {
    const answer = ServerResponse.success({ id: "test-id" });
    const handler = async (_req: PayloadRequest): Promise<Response> => answer;

    const result = await withErrorHandler(handler)(req);

    expect(result).toBe(answer);
  });

  it("renders a marked failure reason as its own copy, not the raw message", async () => {
    const marked = markFailureReason(
      "model-unavailable",
      'The model "gpt-5.4-mini" is not available to this API key.'
    );
    const handler = vi.fn().mockRejectedValue(new Error(marked));

    const result = await withErrorHandler(handler)(req);
    const { message } = (await result.json()) as { message: string };

    expect(message).not.toContain("gpt-5.4-mini");
    expect(message).not.toContain("[translator:");
    expect(message).toContain("`model`");
  });
});
