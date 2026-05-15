export function manifestKeyToExpId(manifestKey: string): string {
  return decodeURIComponent(manifestKey)
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replaceAll(/\//g, "_");
}

export function manifestKeyToExpCookieName(manifestKey: string): string {
  return `exp_${manifestKeyToExpId(manifestKey)}`;
}
