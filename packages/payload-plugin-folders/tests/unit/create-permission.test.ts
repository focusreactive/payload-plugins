import { describe, expect, it } from "vitest";

import { isCreatePermitted } from "../../src/admin/createPermission.js";

describe("isCreatePermitted", () => {
  it("allows a plain true", () => {
    expect(isCreatePermitted(true)).toBe(true);
  });

  it("allows the object Payload sends for an access function that answers a Where", () => {
    expect(isCreatePermitted({ permission: true, where: { folder: { in: [1, 2] } } })).toBe(true);
  });

  it("refuses false, a refused object and anything missing", () => {
    expect(isCreatePermitted(false)).toBe(false);
    expect(isCreatePermitted({ permission: false })).toBe(false);
    expect(isCreatePermitted({ where: {} })).toBe(false);
    expect(isCreatePermitted(undefined)).toBe(false);
    expect(isCreatePermitted(null)).toBe(false);
  });
});
