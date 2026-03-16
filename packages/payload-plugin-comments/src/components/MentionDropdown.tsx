"use client";

import { PopupList, useTranslation } from "@payloadcms/ui";
import { FALLBACK_USERNAME } from "../constants";
import { useComments } from "../providers/CommentsProvider";
import type { User } from "../types";
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
    <div
      className="absolute bottom-[calc(100%+6px)] left-0 w-full z-50 bg-(--theme-elevation-0) rounded-md shadow-[0_-2px_16px_-2px_rgba(0,0,0,0.2)]"
      onMouseDown={(e) => e.preventDefault()}>
      <PopupList.ButtonGroup>
        {users.length === 0 ?
          <p className="m-0 px-3 py-1.5 text-[13px] text-(--theme-elevation-500)">
            {t("comments:noMentionMatches" as never)}
          </p>
        : users.map((user, index) => (
            <PopupList.Button key={user.id} active={index === selectedIndex} onClick={() => onSelect(user)}>
              @{resolveUsername(user, usernameFieldPath, unknownLabel)}
            </PopupList.Button>
          ))
        }
      </PopupList.ButtonGroup>
    </div>
  );
}
