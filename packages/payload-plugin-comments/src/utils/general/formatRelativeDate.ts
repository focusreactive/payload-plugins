export function formatRelativeDate(iso: string, locale: string) {
  let date: Date;

  try {
    date = new Date(iso);

    if (isNaN(date.getTime())) return iso;
  } catch {
    return iso;
  }

  const elapsedMs = Date.now() - date.getTime();
  const seconds = Math.round(elapsedMs / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (seconds < 45) return rtf.format(0, "second");
  if (seconds < 90) return rtf.format(-1, "minute");
  if (seconds < 45 * 60) return rtf.format(-Math.round(seconds / 60), "minute");
  if (seconds < 90 * 60) return rtf.format(-1, "hour");
  if (seconds < 22 * 3600) return rtf.format(-Math.round(seconds / 3600), "hour");
  if (seconds < 36 * 3600) return rtf.format(-1, "day");
  if (seconds < 6 * 86400) return rtf.format(-Math.round(seconds / 86400), "day");
  if (seconds < 10 * 86400) return rtf.format(-1, "week");
  if (seconds < 45 * 86400) return rtf.format(-Math.round(seconds / (7 * 86400)), "week");
  if (seconds < 345 * 86400) return rtf.format(-Math.round(seconds / (30 * 86400)), "month");
  if (seconds < 545 * 86400) return rtf.format(-1, "year");

  return rtf.format(-Math.round(seconds / (365 * 86400)), "year");
}
