// tests/endpoints/errorMapping.pageref.test.ts
import { describe, expect, it } from "vitest";
import { mapGa4Error } from "../../src/endpoints/errorMapping";

describe("mapGa4Error — page identity dims", () => {
  it("flags fr_page_ref as a missing registration", () => {
    const err = new Error(
      "INVALID_ARGUMENT: Field customEvent:fr_page_ref is not a valid dimension."
    );
    const mapped = mapGa4Error(err);
    expect(mapped.setupRequired).toBe(true);
    expect(mapped.missingKey).toBe("fr_page_ref");
  });

  it("flags fr_content_locale as a missing registration", () => {
    const err = new Error(
      "INVALID_ARGUMENT: Field customEvent:fr_content_locale is not a valid dimension."
    );
    const mapped = mapGa4Error(err);
    expect(mapped.missingKey).toBe("fr_content_locale");
  });
});
