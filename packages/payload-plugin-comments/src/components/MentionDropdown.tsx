"use client";

import { useTranslation } from "@payloadcms/ui";
import { FALLBACK_USERNAME } from "../constants";
import { useComments } from "../providers/CommentsProvider";
import type { User } from "../types";
import { cn } from "../utils/general/cn";
import { resolveUsername } from "../utils/user/resolveUsername";

interface MentionDropdownProps {
  users: User[];
  selectedIndex: number;
  onSelect: (user: User) => void;
}

export function MentionDropdown({ users, selectedIndex, onSelect }: MentionDropdownProps) {
  const { usernameFieldPath } = useComments();
  const { t } = useTranslation();

  const unknownLabel = t("comments:unknownAuthor" as never) ?? FALLBACK_USERNAME;

  return (
    <ul
      role="listbox"
      className="absolute bottom-full left-0 mb-1 w-full max-h-48 overflow-y-auto rounded border border-(--theme-elevation-200) bg-(--theme-elevation-0) shadow-md z-50">
      {users.map((user, index) => (
        <li
          key={user.id}
          role="option"
          aria-selected={index === selectedIndex}
          onMouseDown={(e) => {
            e.preventDefault();

            onSelect(user);
          }}
          className={cn(
            "px-3 py-1.5 text-[13px] text-(--theme-text) cursor-pointer",
            index === selectedIndex && "bg-(--theme-elevation-100)",
          )}>
          @{resolveUsername(user, usernameFieldPath, unknownLabel)}
        </li>
      ))}
    </ul>
  );
}
