import { describe, expect, it, vi } from "vitest";
import { generateForField } from "../../../src/server/generate/generateForField";

const callOpenAIChat = vi.hoisted(() => vi.fn());
vi.mock("../../../src/server/generate/openai", () => ({
  callOpenAIChat: (...a: unknown[]) => callOpenAIChat(...a),
}));

const args = {
  kind: "title" as const,
  contentHtml: "<h1>Acme</h1>",
  range: { min: 400, max: 600, unit: "px" as const },
  config: {},
  apiKey: "sk-test",
};

describe("generateForField", () => {
  it("returns the model text with surrounding quotes stripped", async () => {
    callOpenAIChat.mockResolvedValueOnce('"Acme CMS for teams"');
    await expect(generateForField(args)).resolves.toBe("Acme CMS for teams");
  });
  it("passes the default model when none configured", async () => {
    callOpenAIChat.mockResolvedValueOnce("X");
    await generateForField(args);
    expect(callOpenAIChat).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-4o-mini" }));
  });
  it("truncates content to maxContentChars", async () => {
    callOpenAIChat.mockResolvedValueOnce("X");
    await generateForField({
      ...args,
      contentHtml: "y".repeat(10000),
      config: { maxContentChars: 100 },
    });
    const call = callOpenAIChat.mock.calls.at(-1)?.[0] as { user: string };
    expect(call.user).toBe(`Page content:\n\n${"y".repeat(100)}`);
  });
});
