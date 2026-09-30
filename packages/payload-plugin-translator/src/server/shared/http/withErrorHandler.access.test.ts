import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { APIError } from "payload";

import { withErrorHandler } from "./withErrorHandler.js";

// A provider error can carry the API key — the sanitizer's own docblock names
// `401 Incorrect API key provided: sk-proj-…` as the case. Production is the environment that matters;
// under vitest `NODE_ENV` is `test`, where the raw message is a deliberate debug aid.
describe("withErrorHandler — what reaches the caller in production", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const body = async (error: unknown) => {
    const result = await withErrorHandler(vi.fn().mockRejectedValue(error))();
    return (await result.json()) as { message: string };
  };

  it("does not pass a plain error's message through", async () => {
    const { message } = await body(new Error("401 Incorrect API key provided: sk-proj-abc123"));

    expect(message).not.toContain("sk-proj-abc123");
    expect(message).not.toContain("Incorrect API key");
  });

  // A Payload error is one this plugin or the framework raised on purpose, and the caller needs to
  // read it to fix their request. Collapsing those too would turn every actionable 400 into "see the
  // server logs", which is worse than useless on a validation error.
  it("keeps a Payload error's message, which the caller needs", async () => {
    const { message } = await body(
      new APIError('Collection "widgets" is not available for translation', 400)
    );

    expect(message).toContain("widgets");
  });

  it("still answers with a status the caller can act on", async () => {
    const result = await withErrorHandler(
      vi.fn().mockRejectedValue(new APIError("whatever", 404))
    )();

    expect(result.status).toBe(404);
  });
});
