import { describe, expect, it } from "vitest";

import { groupsFromClaims, readRoleMap, roleFromGroups } from "@/lib/auth/oidc/roles";

describe("OIDC groups → CMS role", () => {
  it("strips Keycloak full-path slashes", () => {
    expect(groupsFromClaims({ groups: ["/cms-editors", "other"] })).toEqual([
      "cms-editors",
      "other",
    ]);
    expect(groupsFromClaims({})).toEqual([]);
  });

  it("maps with the default table and picks the most privileged role", () => {
    expect(roleFromGroups(["cms-authors"])).toBe("author");
    expect(roleFromGroups(["cms-editors"])).toBe("user");
    expect(roleFromGroups(["cms-authors", "cms-admins"])).toBe("admin");
  });

  it("defaults to author when nothing matches", () => {
    expect(roleFromGroups([])).toBe("author");
    expect(roleFromGroups(["staff"])).toBe("author");
  });

  it("reads OIDC_ROLE_MAP and ignores unknown roles / bad JSON", () => {
    const map = readRoleMap('{"web-team":"user","root":"superuser"}');
    expect(map).toEqual({ "web-team": "user" });
    expect(roleFromGroups(["web-team"], map)).toBe("user");
    expect(readRoleMap("{not json")["cms-admins"]).toBe("admin");
  });
});
