export function getPagePath(pathname: string, search: string) {
  if (typeof window === "undefined") return "";

  return search ? `${pathname}?${search}` : pathname;
}
