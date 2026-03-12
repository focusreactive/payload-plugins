"use client";

import { cn } from "../utils/general/cn";

type MentionUser = { id: number; name: string };

interface MentionDropdownProps {
  users: MentionUser[];
  selectedIndex: number;
  onSelect: (user: MentionUser) => void;
}

export function MentionDropdown({ users, selectedIndex, onSelect }: MentionDropdownProps) {
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
          @{user.name}
        </li>
      ))}
    </ul>
  );
}
