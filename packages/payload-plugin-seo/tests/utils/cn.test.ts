import { describe, expect, it } from "vitest";
import { cn } from "../../src/utils/style";

describe("cn with frseo prefix", () => {
  it("resolves conflicts between frseo-prefixed utilities", () => {
    expect(cn("frseo:p-2", "frseo:p-4")).toBe("frseo:p-4");
    expect(cn("frseo:hover:bg-neutral-100", "frseo:hover:bg-neutral-200")).toBe(
      "frseo:hover:bg-neutral-200"
    );
  });

  it("keeps consumer (unprefixed) classes untouched alongside plugin classes", () => {
    expect(cn("frseo:px-2", "consumer-card")).toBe("frseo:px-2 consumer-card");
  });

  it("still flattens conditional inputs", () => {
    expect(cn("frseo:flex", false, undefined, "frseo:gap-2")).toBe("frseo:flex frseo:gap-2");
  });
});
