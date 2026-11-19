import React from "react";

import { SiteImage, mediaOf } from "@/components/site/SiteImage";
import type { Media } from "@/payload-types";
import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";

const ICON_SIZE = 100;
const FETCH_TIMEOUT_MS = 5000;
const SVG_DOCUMENT = /<svg\b([^>]*)>([\s\S]*)<\/svg>/iu;
const SVG_ATTRIBUTE = /([\w:-]+)\s*=\s*"([^"]*)"/gu;
const UNSAFE_MARKUP = /<script|<foreignObject|\son\w+\s*=|javascript:/iu;
const KEPT_ATTRIBUTES = ["fill", "height", "viewBox", "width", "xmlns"] as const;

type KeptAttribute = (typeof KEPT_ATTRIBUTES)[number];

interface InlineSvg {
  attributes: Partial<Record<KeptAttribute, string>>;
  markup: string;
}

function parseSvg(source: string): InlineSvg | null {
  const match = SVG_DOCUMENT.exec(source.replaceAll(/<!--[\s\S]*?-->/gu, ""));

  if (!match || UNSAFE_MARKUP.test(match[0])) {
    return null;
  }

  const attributes: InlineSvg["attributes"] = {};

  for (const [, name, value] of match[1].matchAll(SVG_ATTRIBUTE)) {
    if ((KEPT_ATTRIBUTES as readonly string[]).includes(name)) {
      attributes[name as KeptAttribute] = value;
    }
  }

  return { attributes, markup: match[2] };
}

async function loadSvg(url: string): Promise<InlineSvg | null> {
  try {
    const response = await fetch(url, {
      cache: "force-cache",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    return response.ok ? parseSvg(await response.text()) : null;
  } catch {
    return null;
  }
}

/**
 * A condition's icon drawn into the page as `svg`, as the original menu does: its stylesheet sizes
 * the menu icons by `svg` and recolours their first path. Any other file falls back to a plain `img`.
 */
export async function SymptomIcon({
  media,
  alt,
}: {
  media: number | Media | null | undefined;
  alt: string;
}) {
  const image = mediaOf(media);
  const url = stripMarkers(image?.url);
  const isSvg = image?.mimeType === "image/svg+xml" && url?.startsWith("https://");
  const svg = isSvg && url ? await loadSvg(url) : null;

  if (!svg) {
    return <SiteImage alt={alt} height={ICON_SIZE} media={media} width={ICON_SIZE} />;
  }

  return <svg {...svg.attributes} dangerouslySetInnerHTML={{ __html: svg.markup }} />;
}
