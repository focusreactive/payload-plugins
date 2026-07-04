import { describe, expect, it } from "vitest";
import { cn } from "../../src/utils/general/cn";

describe("cn with frcomments prefix", () => {
  it("resolves conflicts between frcomments-prefixed utilities", () => {
    expect(cn("frcomments:p-2", "frcomments:p-4")).toBe("frcomments:p-4");
    expect(cn("frcomments:hover:bg-neutral-100", "frcomments:hover:bg-neutral-200")).toBe(
      "frcomments:hover:bg-neutral-200"
    );
  });

  it("keeps consumer (unprefixed) classes untouched alongside plugin classes", () => {
    expect(cn("frcomments:px-2", "consumer-card")).toBe("frcomments:px-2 consumer-card");
  });

  it("still flattens conditional inputs", () => {
    expect(cn("frcomments:flex", false, undefined, "frcomments:gap-2")).toBe(
      "frcomments:flex frcomments:gap-2"
    );
  });
});
