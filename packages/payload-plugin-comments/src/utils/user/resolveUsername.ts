import { USERNAME_DEFAULT_FIELD_PATH } from "../../constants";
import type { User } from "../../types";
import { getValueByPath } from "../general/getValueByPath";

export function resolveUsername(
  user: User | null | undefined,
  usernameFieldPath: string = USERNAME_DEFAULT_FIELD_PATH,
  unknownLabel: string,
) {
  if (!user) return unknownLabel;

  const customValue = getValueByPath(user, usernameFieldPath);
  if (customValue != null) return customValue;

  const { email } = user;
  if (email) return email;

  return unknownLabel;
}
