/**
 * Cache-bust by file bytes. `updatedAt` changes on alt edits and would
 * re-run every image transform.
 */
export function withMediaVersion(url: string, filesize: number | null | undefined): string {
  if (!url || typeof filesize !== "number" || !Number.isFinite(filesize)) {
    return url;
  }

  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}v=${filesize}`;
}
