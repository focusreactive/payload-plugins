"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PopupList, useTranslation } from "@payloadcms/ui";
import { FALLBACK_USERNAME } from "../constants";
import { useComments } from "../providers/CommentsProvider";
import type { User } from "../types";
import { resolveUsername } from "../utils/user/resolveUsername";

const GAP = 6;

interface MentionDropdownProps {
  users: User[];
  selectedIndex: number;
  onSelect: (user: User) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}

interface Position {
  top: number;
  left: number;
  width: number;
}

export function MentionDropdown({
  users,
  selectedIndex,
  onSelect,
  onClose,
  anchorRef,
}: MentionDropdownProps) {
  const { usernameFieldPath } = useComments();
  const { t } = useTranslation();
  const unknownLabel = t("comments:unknownAuthor" as never) ?? FALLBACK_USERNAME;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  useLayoutEffect(() => {
    const recompute = () => {
      const anchor = anchorRef.current;
      const dropdown = dropdownRef.current;
      if (!anchor || !dropdown) return;

      const rect = anchor.getBoundingClientRect();
      const height = dropdown.offsetHeight;
      const fitsAbove = rect.top >= height + GAP;

      setPosition({
        top: fitsAbove
          ? rect.top + window.scrollY - height - GAP
          : rect.bottom + window.scrollY + GAP,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };

    recompute();

    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);

    return () => {
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
    };
  }, [users, anchorRef]);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;

      if (dropdownRef.current?.contains(target)) {
        return;
      }
      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [onClose]);

  useEffect(() => {
    const container = scrollRef.current;
    const active = container?.querySelector<HTMLElement>(".popup-button-list__button--selected");
    if (!container || !active) return;

    const cRect = container.getBoundingClientRect();
    const aRect = active.getBoundingClientRect();

    if (aRect.top < cRect.top) {
      container.scrollTop -= cRect.top - aRect.top;
    } else if (aRect.bottom > cRect.bottom) {
      container.scrollTop += aRect.bottom - cRect.bottom;
    }
  }, [selectedIndex]);

  if (!anchorRef.current) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: position?.width,
        visibility: position ? "visible" : "hidden",
        zIndex: 9999,
      }}
    >
      <div
        ref={scrollRef}
        className="bg-(--theme-elevation-50) rounded-md shadow-[0_2px_12px_-2px_rgba(0,0,0,0.18)] max-h-25 overflow-y-auto"
        onMouseDown={(e) => e.preventDefault()}
      >
        <PopupList.ButtonGroup>
          {users.length === 0 ? (
            <p className="m-0 px-3 py-1.5 text-[13px] text-(--theme-elevation-500)">
              {t("comments:noMentionMatches" as never)}
            </p>
          ) : (
            users.map((user, index) => (
              <PopupList.Button
                key={user.id}
                active={index === selectedIndex}
                className="hover:bg-(--theme-elevation-100) rounded-none"
                onClick={() => onSelect(user)}
              >
                @{resolveUsername(user, usernameFieldPath, unknownLabel)}
              </PopupList.Button>
            ))
          )}
        </PopupList.ButtonGroup>
      </div>
    </div>,
    document.body
  );
}
