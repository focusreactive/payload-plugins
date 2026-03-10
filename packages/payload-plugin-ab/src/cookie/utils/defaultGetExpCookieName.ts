export function defaultGetExpCookieName(key: string) {
  return `exp_${encodeURIComponent(key)}`;
}
