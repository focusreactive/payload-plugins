/** "8 Jan 2025" in the page locale (dates on cards, lists and post meta). */
export function formatPostDate(iso: string | null | undefined, locale: string): string | null {
  if (!iso) {
    return null;
  }
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
