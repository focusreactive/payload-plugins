import { APIError } from "payload";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ServerResponse } from "./ServerResponse";
import { withErrorHandler } from "./withErrorHandler";

describe("withErrorHandler", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns handler result on success", async () => {
    const expectedResponse = ServerResponse.success({ data: "test" });
    const handler = vi.fn().mockResolvedValue(expectedResponse);

    const wrappedHandler = withErrorHandler(handler);
    const result = await wrappedHandler();

    expect(result).toBe(expectedResponse);
  });

  it("passes arguments to handler", async () => {
    const handler = vi.fn().mockResolvedValue(ServerResponse.success());

    const wrappedHandler = withErrorHandler(handler);
    await wrappedHandler("arg1", "arg2", { option: true });

    expect(handler).toHaveBeenCalledWith("arg1", "arg2", { option: true });
  });

  it("handles APIError with custom status", async () => {
    const apiError = new APIError("Not found", 404);
    const handler = vi.fn().mockRejectedValue(apiError);

    const wrappedHandler = withErrorHandler(handler);
    const result = await wrappedHandler();

    expect(result.status).toBe(404);
    expect(await result.json()).toEqual({ message: "Not found" });
  });

  it("handles APIError with different statuses", async () => {
    const badRequestError = new APIError("Bad request data", 400);
    const handler = vi.fn().mockRejectedValue(badRequestError);

    const wrappedHandler = withErrorHandler(handler);
    const result = await wrappedHandler();

    expect(result.status).toBe(400);
    expect(await result.json()).toEqual({ message: "Bad request data" });
  });

  it("handles generic Error with 500 status", async () => {
    const error = new Error("Something went wrong");
    const handler = vi.fn().mockRejectedValue(error);

    const wrappedHandler = withErrorHandler(handler);
    const result = await wrappedHandler();

    expect(result.status).toBe(500);
    expect(await result.json()).toEqual({ message: "Something went wrong" });
  });

  it("handles unknown error with default message", async () => {
    const handler = vi.fn().mockRejectedValue("string error");

    const wrappedHandler = withErrorHandler(handler);
    const result = await wrappedHandler();

    expect(result.status).toBe(500);
    expect(await result.json()).toEqual({ message: "Internal server error" });
  });

  it("logs error to console", async () => {
    const error = new Error("Test error");
    const handler = vi.fn().mockRejectedValue(error);

    const wrappedHandler = withErrorHandler(handler);
    await wrappedHandler();

    expect(console.error).toHaveBeenCalledWith(
      "[TranslateKit] Handler error:",
      error
    );
  });

  it("preserves handler type signature", async () => {
    const typedHandler = async (
      id: string,
      options: { force: boolean }
    ): Promise<Response> => ServerResponse.success({ id, options });

    const wrappedHandler = withErrorHandler(typedHandler);

    // TypeScript should allow these calls
    const result = await wrappedHandler("test-id", { force: true });
    expect(result.status).toBe(200);
  });
});
