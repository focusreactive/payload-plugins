"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "payload-comments-collapsed";

function readStorage(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeStorage(data: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function useCollapseState(
  groupKey: string
): [isCollapsed: boolean, toggle: () => void, open: () => void] {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = readStorage();

    return stored[groupKey] === true;
  });

  useEffect(() => {
    const stored = readStorage();

    setIsCollapsed(stored[groupKey] === true);
  }, [groupKey]);

  const toggle = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      const stored = readStorage();

      if (next) {
        stored[groupKey] = true;
      } else {
        delete stored[groupKey];
      }

      writeStorage(stored);
      return next;
    });
  };

  const open = () => {
    setIsCollapsed(false);
  };

  return [isCollapsed, toggle, open];
}
