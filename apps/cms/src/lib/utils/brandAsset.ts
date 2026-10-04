import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Public URL of a CT brand file (`public/ct/<file>`, copied there by the CT seed and git-ignored),
 * or `fallback` when it is not present — a fresh clone or a deploy without the client's assets.
 * Server-only (reads the filesystem).
 */
export function brandAsset(file: string, fallback: string): string {
  return existsSync(path.join(process.cwd(), "public", "ct", file)) ? `/ct/${file}` : fallback;
}
