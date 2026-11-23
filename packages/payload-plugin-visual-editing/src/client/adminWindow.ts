export const adminOriginOf = (adminOrigin: string): string => adminOrigin || window.location.origin;

export function findAdminWindow(win: Window): Window | null {
  if (win.parent && win.parent !== win) return win.parent;
  const opener = win.opener as Window | null;
  return opener && !opener.closed ? opener : null;
}
