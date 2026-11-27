"use client";

import { useEffect } from "react";

const ADMIN_TAB_NAME = "payload-ve-admin";

const hasAdminWindow = (): boolean => {
  const opener = window.opener as Window | null;
  return window.self !== window.top || (opener !== null && !opener.closed);
};

export const VisualEditingEditRouter: React.FC = () => {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (hasAdminWindow()) {
        return;
      }

      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const badge = (event.target as Element | null)?.closest?.("a.ve-edit-label");
      if (!(badge instanceof HTMLAnchorElement)) {
        return;
      }

      const href = badge.href;
      if (!href) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      window.open(href, ADMIN_TAB_NAME);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
};
