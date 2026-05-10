export function getPageTitle() {
  if (typeof document === "undefined") return "";

  return document.title;
}
