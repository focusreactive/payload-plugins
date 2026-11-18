import { describe, it, expect } from "vitest";

import { deriveAbilities } from "../abilities.js";

describe("deriveAbilities", () => {
  it("turns each action route under the base path into its ability", () => {
    const abilities = deriveAbilities(
      [
        { method: "post", path: "/i18n/enqueue" },
        { method: "delete", path: "/i18n/cancel" },
        { method: "post", path: "/i18n/run/:collection_slug/:collection_id" },
        { method: "post", path: "/i18n/stale/dismiss" },
        { method: "post", path: "/i18n/field" },
      ],
      "/i18n"
    );

    expect(abilities).toEqual({
      translate: true,
      cancel: true,
      runNow: true,
      staleness: true,
      translateField: true,
    });
  });

  it("counts a route only under the base path it is given", () => {
    const abilities = deriveAbilities([{ method: "post", path: "/translate/enqueue" }], "/i18n");

    expect(abilities.translate).toBe(false);
  });

  it("counts a route only with the method the endpoint table names", () => {
    const abilities = deriveAbilities([{ method: "get", path: "/i18n/enqueue" }], "/i18n");

    expect(abilities.translate).toBe(false);
  });

  it("reads staleness from the dismiss route, not the staleness read", () => {
    const abilities = deriveAbilities(
      [{ method: "get", path: "/i18n/stale/:collection_slug/:collection_id" }],
      "/i18n"
    );

    expect(abilities.staleness).toBe(false);
  });
});
