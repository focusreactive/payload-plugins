import { describe, it, expect } from "vitest";
import { releasesBeforeChange } from "../../hooks/releasesBeforeChange";

function makeArgs(data: Record<string, any>, originalDoc?: Record<string, any>) {
  return {
    data,
    originalDoc: originalDoc ?? {},
    req: {} as any,
    operation: "update" as const,
    collection: {} as any,
    context: {} as any,
  };
}

describe("releasesBeforeChange", () => {
  it("should allow creating a release with draft status", () => {
    const args = {
      data: { name: "My Release", status: "draft" },
      req: {} as any,
      operation: "create" as const,
      collection: {} as any,
      context: {} as any,
    };
    const result = releasesBeforeChange(args as any);
    expect(result.status).toBe("draft");
  });

  it("should force draft status on create regardless of input", () => {
    const args = {
      data: { name: "My Release", status: "published" },
      req: {} as any,
      operation: "create" as const,
      collection: {} as any,
      context: {} as any,
    };
    const result = releasesBeforeChange(args as any);
    expect(result.status).toBe("draft");
  });

  it("should allow valid transition from draft to scheduled", () => {
    const result = releasesBeforeChange(
      makeArgs({ status: "scheduled" }, { status: "draft" }) as any,
    );
    expect(result.status).toBe("scheduled");
  });

  it("should throw on invalid transition from published to draft", () => {
    expect(() =>
      releasesBeforeChange(
        makeArgs({ status: "draft" }, { status: "published" }) as any,
      ),
    ).toThrow(/Invalid status transition/);
  });

  it("should throw on invalid transition from cancelled to draft", () => {
    expect(() =>
      releasesBeforeChange(
        makeArgs({ status: "draft" }, { status: "cancelled" }) as any,
      ),
    ).toThrow(/Invalid status transition/);
  });

  it("should pass through unchanged status", () => {
    const result = releasesBeforeChange(
      makeArgs({ status: "draft", name: "Updated" }, { status: "draft" }) as any,
    );
    expect(result.name).toBe("Updated");
  });

  it("should allow valid transition to published without setting publishedAt", () => {
    const result = releasesBeforeChange(
      makeArgs({ status: "published" }, { status: "publishing" }) as any,
    );
    expect(result.publishedAt).toBeUndefined();
  });
});
