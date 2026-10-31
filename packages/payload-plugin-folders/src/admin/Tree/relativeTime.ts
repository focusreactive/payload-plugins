const secondsPerUnit: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const createRelativeFormatter = (language: string): Intl.RelativeTimeFormat => {
  try {
    return new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  } catch {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  }
};

/** "3 days ago", "yesterday", "now": the largest whole unit that fits, in the admin language. */
export const formatRelativeTime = (
  isoDate: string,
  language: string,
  now: number = Date.now()
): string => {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) {
    return "";
  }
  const formatter = createRelativeFormatter(language);
  const secondsAgo = Math.round((now - timestamp) / 1000);
  for (const [unit, seconds] of secondsPerUnit) {
    if (Math.abs(secondsAgo) >= seconds) {
      return formatter.format(-Math.trunc(secondsAgo / seconds), unit);
    }
  }

  return formatter.format(0, "second");
};

/** The full date and time, shown on hover. */
export const formatAbsoluteTime = (isoDate: string, language: string): string => {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(
      timestamp
    );
  } catch {
    return new Date(timestamp).toISOString();
  }
};
