import { roleOf } from "./roles";
import type { isAccessible } from "./types";

export const superAdmin: isAccessible<boolean> = ({ req: { user } }) =>
  roleOf(user) === "administrator";
