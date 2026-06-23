export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type ContentNode =
  | { type: "heading"; level: HeadingLevel; text: string }
  | { type: "paragraph"; text: string }
  | { type: "link"; href: string; text: string }
  | { type: "image"; src: string; alt?: string }
  | { type: "video"; src: string; poster?: string }
  | { type: "html"; html: string };

const TYPES = new Set(["heading", "paragraph", "link", "image", "video", "html"]);

export function isContentNode(value: unknown): value is ContentNode {
  return typeof value === "object" && value !== null && TYPES.has((value as { type?: string }).type ?? "");
}
