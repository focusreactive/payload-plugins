import { describe, expect, it } from "vitest";

import { badRequest } from "../../src/core/badRequest.js";
import { noLocaleKey, toLocaleOrNull } from "../../src/core/locales.js";
import { badRequest as endpointBadRequest } from "../../src/endpoints/request.js";

describe("badRequest", () => {
  it("is a 400 whose message is public", () => {
    const error = badRequest("Choose at least one item");

    expect(error.status).toBe(400);
    expect(error.message).toBe("Choose at least one item");
    expect(error.isPublic).toBe(true);
  });

  it("is the same function the endpoints import", () => {
    expect(endpointBadRequest).toBe(badRequest);
  });
});

describe("toLocaleOrNull", () => {
  it("gives null for the slot of a site that localizes nothing", () => {
    expect(toLocaleOrNull(noLocaleKey)).toBeNull();
  });

  it("gives a locale code as it is", () => {
    expect(toLocaleOrNull("de")).toBe("de");
  });
});
