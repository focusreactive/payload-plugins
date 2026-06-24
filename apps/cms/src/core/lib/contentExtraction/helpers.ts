import { image, link } from "@focus-reactive/payload-plugin-seo/content";
import type { ContentNode } from "@focus-reactive/payload-plugin-seo/content";

import type { Action, ImageGroup, Upload, UploadField } from "./types";

export function compact(nodes: (ContentNode | null)[]): ContentNode[] {
  return nodes.filter((n): n is ContentNode => n !== null);
}

export function asUpload(value: UploadField): Upload | null {
  return value && typeof value === "object" ? value : null;
}

export function actionLinks(actions: Action[] | null | undefined): ContentNode[] {
  return (actions ?? []).map((a) => link(a.url, a.label)).filter((n): n is ContentNode => n !== null);
}

export function groupImage(group: ImageGroup): ContentNode | null {
  const media = asUpload(group?.image);

  return image(media?.url, media?.alt);
}

export function uploadImage(value: Upload): ContentNode | null {
  const media = asUpload(value);

  return image(media?.url, media?.alt);
}
