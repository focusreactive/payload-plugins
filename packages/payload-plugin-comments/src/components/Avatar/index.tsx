import type { ClientUser } from "payload";

import type { User } from "../../types";
import { resolveUsername } from "../../utils/user/resolveUsername";

interface Props {
  className?: string;
  user?: User | ClientUser | null;
  usernameFieldPath?: string;
  fallbackName: string;
}

export function Avatar({ user, usernameFieldPath, fallbackName }: Props) {
  const userName = resolveUsername(user, usernameFieldPath, fallbackName);
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="w-9 h-9 rounded-full bg-(--theme-elevation-150) text-(--theme-text) flex items-center justify-center text-[14px] font-semibold">
      {userInitial}
    </div>
  );
}
