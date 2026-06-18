import type { Payload } from "payload";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMentionEmails } from "../../src/services/sendMentionEmails";

const ORIGINAL_ENV = { ...process.env };

function makePayload(): Payload {
  return {
    config: { admin: { custom: {} } },
    find: vi.fn().mockResolvedValue({ docs: [{ id: 1, email: "u@example.com" }] }),
  } as unknown as Payload;
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("sendMentionEmails — RESEND gating", () => {
  it("warns + returns without sending when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.RESEND_FROM_EMAIL = "noreply@example.com";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await sendMentionEmails({
      mentionIds: [1],
      authorName: "Alice",
      commentText: "hello @(1)",
      collectionSlug: "posts",
      documentId: 1,
      payload: makePayload(),
    });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Mention emails disabled"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("RESEND_API_KEY"));
  });

  it("warns when RESEND_FROM_EMAIL is unset", async () => {
    process.env.RESEND_API_KEY = "re_test";
    delete process.env.RESEND_FROM_EMAIL;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await sendMentionEmails({
      mentionIds: [1],
      authorName: "Alice",
      commentText: "hi @(1)",
      collectionSlug: "posts",
      documentId: 1,
      payload: makePayload(),
    });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("RESEND_FROM_EMAIL"));
  });
});
