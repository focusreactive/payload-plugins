import type { ClientUser } from "payload";

import { USERNAME_DEFAULT_FIELD_PATH } from "../../constants";
import type { User } from "../../types";
import { getValueByPath } from "../general/getValueByPath";

export function resolveUsername(
  user: User | ClientUser | null | undefined,
  usernameFieldPath: string = USERNAME_DEFAULT_FIELD_PATH,
  fallbackLabel: string
) {
  if (!user) {return fallbackLabel;}

  const customValue = getValueByPath(user, usernameFieldPath);
  if (customValue != null) {return customValue;}

  const { email } = user;
  if (email) {return email;}

  return fallbackLabel;
}
