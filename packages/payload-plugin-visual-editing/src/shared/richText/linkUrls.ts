const ALLOWED_SCHEMES: ReadonlySet<string> = new Set(["http:", "https:", "mailto:", "tel:"]);

const SCHEME = /^[a-z][a-z\d+.-]*:/iu;

const LAST_CHARACTER_BROWSERS_IGNORE = " ";

const withoutIgnoredCharacters = (url: string): string =>
  [...url].filter((character) => character > LAST_CHARACTER_BROWSERS_IGNORE).join("");

export const linkUrlOf = (typed: string): string => typed.trim();

export const isAllowedLinkUrl = (url: string): boolean => {
  const compact = withoutIgnoredCharacters(url);
  if (compact === "") return false;
  const scheme = SCHEME.exec(compact)?.[0];
  return scheme === undefined || ALLOWED_SCHEMES.has(scheme.toLowerCase());
};
