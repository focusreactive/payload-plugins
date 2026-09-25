import type { User } from "@/payload-types";

export type Role = User["role"];

export const EDITOR_ROLES: readonly Role[] = ["globalEditor", "marketEditor"];

// req.user can also be an MCP API key, which has no role.
export function roleOf(user: unknown): Role | null {
  return user && typeof user === "object" && "role" in user ? (user as User).role : null;
}
