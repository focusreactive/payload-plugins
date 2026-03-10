export function getCookie(name: string) {
  if (typeof document === "undefined") return null;

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));

  if (!match) return null;

  const value = match[1];

  return value != null ? decodeURIComponent(value) : null;
}
