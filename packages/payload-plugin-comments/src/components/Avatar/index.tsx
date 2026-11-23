import type { ClientUser } from "payload";
import type { User } from "../../types";
import { resolveUsername } from "../../utils/user/resolveUsername";
import { cn } from "../../utils/general/cn";

interface Props {
  className?: string;
  user?: User | ClientUser | null;
  usernameFieldPath?: string;
  fallbackName: string;
}

const HUES = [212, 152, 28, 268, 340, 180, 320, 4];

function hueFor(name: string) {
  let hash = 2166136261;
  for (const char of name) hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 16777619) >>> 0;
  return HUES[hash % HUES.length] ?? 212;
}

export function Avatar({ className, user, usernameFieldPath, fallbackName }: Props) {
  const userName = resolveUsername(user, usernameFieldPath, fallbackName);
  const userInitial = userName.charAt(0).toUpperCase();
  const hue = user ? hueFor(userName) : null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[12px] font-semibold",
        hue === null && "bg-(--theme-elevation-150) text-(--theme-elevation-600)",
        className
      )}
      style={
        hue === null
          ? undefined
          : {
              background: `color-mix(in oklch, hsl(${hue} 65% 50%) 18%, var(--theme-elevation-0))`,
              color: `color-mix(in oklch, hsl(${hue} 60% 38%) 75%, var(--theme-elevation-800))`,
            }
      }
    >
      {userInitial}
    </div>
  );
}
