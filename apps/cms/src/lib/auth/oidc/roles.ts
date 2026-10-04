/**
 * Keycloak (or any IdP) groups → CMS role (§5.9). OIDC_ROLE_MAP is JSON {"group": "role"}; group
 * names may arrive as full paths ("/cms-editors") and are compared without the leading slash.
 * The most privileged matching role wins; no match → author (least privilege).
 */
export type CmsRole = "admin" | "user" | "author";

const DEFAULT_MAP: Record<string, CmsRole> = {
  "cms-admins": "admin",
  "cms-authors": "author",
  "cms-editors": "user",
};

const RANK: Record<CmsRole, number> = { admin: 3, author: 1, user: 2 };

export const DEFAULT_ROLE: CmsRole = "author";

export function readRoleMap(raw = process.env.OIDC_ROLE_MAP): Record<string, CmsRole> {
  if (!raw?.trim()) {
    return DEFAULT_MAP;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, CmsRole] => entry[1] in RANK)
    );
  } catch {
    return DEFAULT_MAP;
  }
}

export function groupsFromClaims(claims: Record<string, unknown>): string[] {
  const groups = claims.groups;
  return Array.isArray(groups)
    ? groups
        .filter((group): group is string => typeof group === "string")
        .map((group) => group.replace(/^\/+/u, ""))
    : [];
}

export function roleFromGroups(groups: string[], map = readRoleMap()): CmsRole {
  let role: CmsRole | null = null;
  for (const group of groups) {
    const mapped = map[group];
    if (mapped && (!role || RANK[mapped] > RANK[role])) {
      role = mapped;
    }
  }
  return role ?? DEFAULT_ROLE;
}
