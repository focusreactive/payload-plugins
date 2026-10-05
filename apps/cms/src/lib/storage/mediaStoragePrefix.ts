const toPathSegment = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

export function getMediaStoragePrefix(): string {
  if (process.env.VERCEL_ENV === "production") {
    return "";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return `preview/${toPathSegment(process.env.VERCEL_GIT_COMMIT_REF ?? "unknown")}`;
  }

  return "dev";
}
