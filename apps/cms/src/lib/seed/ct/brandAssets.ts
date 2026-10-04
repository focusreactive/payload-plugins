/**
 * Brand files (git-ignored): copies the official logo from .local/ct/brand into public/ct and
 * derives the on-dark logo and the ring mark from it. Without the logo (fresh clone, archive not
 * unpacked) a neutral placeholder is written so the demo still renders.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SeedContext } from "./context";
import { log } from "./log";

export interface BrandFiles {
  logo: Buffer;
  logoOnDark: Buffer;
  mark: Buffer;
  placeholder: boolean;
}

const LOGO_GREEN = /#64a800/giu;

function placeholderLogo(name: string, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 77" width="360" height="77"><g fill="none" stroke="${color}" stroke-width="6"><circle cx="38" cy="38.5" r="33"/><circle cx="38" cy="38.5" r="20"/></g><text x="86" y="52" font-family="Inter, Arial, sans-serif" font-size="40" font-weight="700" fill="${color}">${name}</text></svg>`;
}

/** The ring "C" sits in the left square of the 360×77 wordmark: crop the viewBox to it. */
export function deriveMark(logoSvg: string): string {
  const viewBox = /viewBox="([\d.\s-]+)"/u.exec(logoSvg)?.[1]?.trim().split(/\s+/u).map(Number);
  const height = viewBox?.[3] ?? 77;
  const minX = viewBox?.[0] ?? 0;
  const minY = viewBox?.[1] ?? 0;
  return logoSvg
    .replace(/viewBox="[^"]*"/u, `viewBox="${minX} ${minY} ${height} ${height}"`)
    .replace(/\swidth="[^"]*"/u, ` width="${height}"`)
    .replace(/\sheight="[^"]*"/u, ` height="${height}"`);
}

export async function prepareBrandFiles(ctx: SeedContext): Promise<BrandFiles> {
  const source = path.join(ctx.flags.localDir, "brand", "logo.svg");
  const placeholder = !existsSync(source);
  if (placeholder) {
    log.warn("brand/logo.svg not found — using a neutral placeholder logo.");
  }
  const logoSvg = placeholder ? placeholderLogo("CT", "#64a800") : await readFile(source, "utf-8");
  const onDarkSvg = placeholder
    ? placeholderLogo("CT", "#ffffff")
    : logoSvg.replaceAll(LOGO_GREEN, "#ffffff");
  const markSvg = deriveMark(logoSvg);

  const publicDir = path.resolve(process.cwd(), "public", "ct");
  await mkdir(publicDir, { recursive: true });
  await writeFile(path.join(publicDir, "logo.svg"), logoSvg);
  await writeFile(path.join(publicDir, "logo-on-dark.svg"), onDarkSvg);
  await writeFile(path.join(publicDir, "mark.svg"), markSvg);

  return {
    logo: Buffer.from(logoSvg),
    logoOnDark: Buffer.from(onDarkSvg),
    mark: Buffer.from(markSvg),
    placeholder,
  };
}
