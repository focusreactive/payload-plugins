import type { PlainObject } from "../shared/plainObject.js";

import { isMessageFrom } from "../shared/messageSource.js";
import { isPlainObject } from "../shared/plainObject.js";

export const adminOriginOf = (adminOrigin: string, win: Window): string =>
  adminOrigin || win.location.origin;

export function findAdminWindow(win: Window): Window | null {
  if (win.parent && win.parent !== win) return win.parent;
  const opener = win.opener as Window | null;
  return opener && !opener.closed ? opener : null;
}

export const isFramedByAdmin = (win: Window): boolean => win.parent !== win;

export function hearTheAdmin(
  win: Window,
  adminOrigin: () => string,
  onMessage: (message: PlainObject) => void
): () => void {
  const hear = (event: MessageEvent) => {
    if (!isMessageFrom(event, adminOriginOf(adminOrigin(), win), findAdminWindow(win))) return;
    if (isPlainObject(event.data)) onMessage(event.data);
  };
  win.addEventListener("message", hear);
  return () => win.removeEventListener("message", hear);
}
