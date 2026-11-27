import type { isAccessible } from "./types";

export const EDITOR_ROLE = "editor";

/** True for a signed-in user whose role is `editor`. Accepts any user shape (server or client). */
export const isEditor = (user: unknown): boolean =>
  typeof user === "object" &&
  user !== null &&
  "role" in user &&
  (user as { role?: unknown }).role === EDITOR_ROLE;

export const editor: isAccessible = ({ req: { user } }) => isEditor(user);
