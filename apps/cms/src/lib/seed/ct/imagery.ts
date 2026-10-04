/**
 * Generated imagery (plan §6.11), rendered with sharp from SVG. Deterministic per slug so re-runs
 * produce identical files. Uses only brand colours; text is the post/page title.
 */
import { createHash } from "node:crypto";

import sharp from "sharp";

const C = {
  darkBlue: "#124853",
  electric: "#b5ff6b",
  green800: "#365706",
  lightGreen: "#5ab165",
  primarySoft: "#dcf5b8",
  sand: "#f4f3f2",
  slateBlue: "#296e72",
  white: "#ffffff",
};

const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";
const MONO = "'IBM Plex Mono', 'DejaVu Sans Mono', monospace";

function hash(text: string): number {
  return createHash("sha1").update(text).digest().readUInt32BE(0);
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Greedy word wrap by an average glyph width; the last line gets an ellipsis when truncated. */
export function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) {
    lines.push(current);
  }
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1]!.replace(/\s+\S*$/u, "")}…`;
    return kept;
  }
  return lines;
}

function rings(
  cx: number,
  cy: number,
  radii: number[],
  stroke: string,
  opacity: number,
  width = 2
): string {
  return radii
    .map(
      (r) =>
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${width}"/>`
    )
    .join("");
}

/** Small ring mark (the logo's "C" motif, drawn — not the client's artwork). */
function ringMark(x: number, y: number, size: number, color: string): string {
  const r = size / 2;
  return `<g transform="translate(${x} ${y})"><circle cx="${r}" cy="${r}" r="${r - 3}" fill="none" stroke="${color}" stroke-width="5"/><circle cx="${r}" cy="${r}" r="${r * 0.55}" fill="none" stroke="${color}" stroke-width="5"/></g>`;
}

export interface CoverOptions {
  title: string;
  eyebrow: string;
  slug: string;
  /** Force the sand variant (report covers); otherwise every third slug (by hash) is sand. */
  variant?: "dark" | "sand";
}

/** 1600×900 JPEG cover: dark blue (or sand), rings, mono eyebrow, title, ring mark. */
export async function renderCover({
  title,
  eyebrow,
  slug,
  variant,
}: CoverOptions): Promise<Buffer> {
  const h = hash(slug);
  const sand = variant ? variant === "sand" : h % 3 === 0;
  const bg = sand ? C.sand : C.darkBlue;
  const fg = sand ? C.darkBlue : C.white;
  const eyebrowColor = sand ? C.slateBlue : C.electric;
  const cx = 1100 + (h % 400);
  const cy = 120 + ((h >> 8) % 300);
  const lines = wrapText(title, 30, 3);
  const titleSvg = lines
    .map(
      (line, i) =>
        `<text x="120" y="${470 + i * 76 - (lines.length - 1) * 38}" font-family="${FONT}" font-size="64" font-weight="700" fill="${fg}">${escapeXml(line)}</text>`
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="${bg}"/>
  ${rings(cx, cy, [140, 210, 280, 350, 420, 490, 560, 630, 700], sand ? C.slateBlue : C.electric, 0.18)}
  <text x="120" y="300" font-family="${MONO}" font-size="26" letter-spacing="5" fill="${eyebrowColor}">${escapeXml(eyebrow.toUpperCase())}</text>
  ${titleSvg}
  ${ringMark(1440, 740, 64, sand ? C.slateBlue : C.electric)}
</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 84 }).toBuffer();
}

/** 320×320 PNG initials avatar on primary-soft. */
export async function renderAvatar(name: string): Promise<Buffer> {
  const initials = name
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="${C.primarySoft}"/><text x="160" y="160" dy="0.35em" text-anchor="middle" font-family="${FONT}" font-size="128" font-weight="600" fill="${C.green800}">${escapeXml(initials)}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Section background textures for editors (§6.11). */
export async function renderTexture(
  kind: "dark-rings" | "sand-grid" | "green-band"
): Promise<Buffer> {
  let body = "";
  if (kind === "dark-rings") {
    body = `<rect width="1920" height="1080" fill="${C.darkBlue}"/>${rings(1500, 200, [160, 240, 320, 400, 480, 560, 640, 720, 800], C.electric, 0.16)}`;
  } else if (kind === "sand-grid") {
    const grid = Array.from(
      { length: 41 },
      (_, i) => `<path d="M${i * 48} 0V1080" stroke="#d9dbd5" stroke-width="1"/>`
    )
      .concat(
        Array.from(
          { length: 23 },
          (_, i) => `<path d="M0 ${i * 48}H1920" stroke="#d9dbd5" stroke-width="1"/>`
        )
      )
      .join("");
    body = `<rect width="1920" height="1080" fill="${C.sand}"/><g opacity="0.7">${grid}</g>`;
  } else {
    body = `<rect width="1920" height="1080" fill="${C.white}"/><path d="M0 1080 L1920 620 L1920 1080 Z" fill="${C.lightGreen}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">${body}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
}

/** 1200×630 Open Graph default: dark blue, rings, site name. */
export async function renderOgImage(siteName: string, tagline: string): Promise<Buffer> {
  const lines = wrapText(tagline, 34, 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${C.darkBlue}"/>${rings(1000, 120, [120, 180, 240, 300, 360, 420], C.electric, 0.18)}<text x="90" y="230" font-family="${MONO}" font-size="24" letter-spacing="4" fill="${C.electric}">${escapeXml(siteName.toUpperCase())}</text>${lines
    .map(
      (line, i) =>
        `<text x="90" y="${320 + i * 70}" font-family="${FONT}" font-size="58" font-weight="700" fill="${C.white}">${escapeXml(line)}</text>`
    )
    .join("")}${ringMark(1060, 500, 56, C.electric)}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
}
