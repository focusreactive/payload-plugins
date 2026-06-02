import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formatZodIssues } from "../../src/endpoints/validateBody";

describe("formatZodIssues", () => {
  it("joins issues with '; ' and includes path", () => {
    const r = z.object({ dateRange: z.object({}) }).safeParse({});
    if (r.success) throw new Error("expected failure");
    const msg = formatZodIssues(r.error.issues);
    expect(msg).toMatch(/dateRange/u);
  });
  it("returns a single line for a single issue", () => {
    const r = z.object({ a: z.string() }).safeParse({});
    if (r.success) throw new Error("expected failure");
    const msg = formatZodIssues(r.error.issues);
    expect(msg.includes(";")).toBe(false);
  });
});
