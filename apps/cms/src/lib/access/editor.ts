import { EDITOR_ROLES, roleOf } from "./roles";
import type { isAccessible } from "./types";

export const editor: isAccessible<boolean> = ({ req: { user } }) => {
  const role = roleOf(user);
  return role !== null && EDITOR_ROLES.includes(role);
};
