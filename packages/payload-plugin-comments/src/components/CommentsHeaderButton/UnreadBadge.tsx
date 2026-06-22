"use client";

import { useTranslation } from "@payloadcms/ui";
import { cn } from "../../utils/general/cn";
import { UNREAD_BADGE_CAP } from "../../constants";

interface Props {
  count: number;
  className?: string;
}

export function UnreadBadge({ count, className }: Props) {
  const { t } = useTranslation();
  const display = count > UNREAD_BADGE_CAP ? `${UNREAD_BADGE_CAP}+` : String(count);
  const ariaLabel = t("comments:unreadMentionsAria" as never, { count }) as string;

  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "absolute -top-1 -right-1 min-w-[14px] h-[14px] px-[3px] rounded-full",
        "bg-red-600 text-white text-[9px] font-semibold leading-[14px] text-center",
        "pointer-events-none select-none",
        className
      )}
    >
      {display}
    </span>
  );
}
