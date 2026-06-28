import {
  compact,
  heading,
  html,
  image,
  paragraph,
} from "@focus-reactive/payload-plugin-seo/content";
import type { ContentNode, DocStore } from "@focus-reactive/payload-plugin-seo/content";

import { buildUrl } from "@/lib/utils/path/buildUrl";

import { groupImage } from "./helpers";
import { linkToContentNode } from "./links";
import type { LinkResolveCtx, LinkValue } from "./links";
import type { ImageGroup, Upload } from "./types";

export interface RichTextResolveCtx {
  docs: DocStore;
  locale: string;
}

type LexNode = Record<string, unknown>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function childrenOf(node: LexNode): LexNode[] {
  return Array.isArray(node.children) ? (node.children.filter(isRecord) as LexNode[]) : [];
}

function escapeText(s: string): string {
  return s.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/gu, "&quot;");
}

const FORMAT_TAGS: Array<[number, string]> = [
  [1, "strong"],
  [2, "em"],
  [4, "s"],
  [8, "u"],
  [16, "code"],
  [32, "sub"],
  [64, "sup"],
];

function applyFormat(text: string, format: unknown): string {
  const flags = typeof format === "number" ? format : 0;
  let out = text;

  for (const [bit, tag] of FORMAT_TAGS) {
    if (flags & bit) out = `<${tag}>${out}</${tag}>`;
  }

  return out;
}

function lexicalLinkHref(fields: Record<string, unknown>, ctx: RichTextResolveCtx): string {
  const doc = fields.doc;
  if (fields.linkType !== "internal" || !isRecord(doc)) return str(fields.url);

  const relationTo = doc.relationTo;
  if (relationTo !== "page" && relationTo !== "posts") return str(fields.url);

  const value = doc.value;
  const resolved = isRecord(value)
    ? value
    : (ctx.docs.get(relationTo, value as string | number) as Record<string, unknown> | undefined);
  if (!resolved) return "";

  if (relationTo === "page") {
    return (
      buildUrl({
        collection: "page",
        breadcrumbs: resolved.breadcrumbs as never,
        slug: str(resolved.slug),
        locale: ctx.locale,
        absolute: false,
      }) || "/"
    );
  }

  return buildUrl({
    collection: "posts",
    slug: str(resolved.slug),
    locale: ctx.locale,
    absolute: false,
  });
}

function serializeInline(nodes: LexNode[], ctx: RichTextResolveCtx): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return applyFormat(escapeText(str(node.text)), node.format);
        case "linebreak":
          return "<br />";
        case "tab":
          return " ";
        case "link":
        case "autolink": {
          const fieldsHref = isRecord(node.fields) ? lexicalLinkHref(node.fields, ctx) : "";
          const href = fieldsHref || str(node.url);
          const inner = serializeInline(childrenOf(node), ctx);
          return href ? `<a href="${escapeAttr(href)}">${inner}</a>` : inner;
        }
        default:
          return serializeInline(childrenOf(node), ctx);
      }
    })
    .join("");
}

function serializeList(node: LexNode, ctx: RichTextResolveCtx): string {
  const tag = node.tag === "ol" ? "ol" : "ul";
  const items = childrenOf(node)
    .map((li) => `<li>${serializeInline(childrenOf(li), ctx)}</li>`)
    .join("");
  return `<${tag}>${items}</${tag}>`;
}

function textOf(node: LexNode): string {
  if (node.type === "text") return str(node.text);
  return childrenOf(node)
    .map((child) => textOf(child))
    .join("");
}

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

function expandBlock(
  fields: Record<string, unknown>,
  ctx: RichTextResolveCtx
): (ContentNode | null)[] {
  const linkCtx: LinkResolveCtx = { docs: ctx.docs, locale: ctx.locale };

  switch (fields.blockType) {
    case "cardsGridInline":
      return ((fields.items as Array<Record<string, unknown>> | undefined) ?? []).flatMap(
        (item) => [
          heading(3, str(item.title)),
          paragraph(str(item.description)),
          groupImage(item.image as ImageGroup, ctx.docs),
          linkToContentNode(item.link as LinkValue, linkCtx),
        ]
      );
    case "logosInline":
      return [
        paragraph(str(fields.label)),
        ...((fields.items as Array<Record<string, unknown>> | undefined) ?? []).flatMap((item) => [
          groupImage(item.image as ImageGroup, ctx.docs),
          linkToContentNode(item.link as LinkValue, linkCtx),
        ]),
      ];
    case "codeInline":
      return [
        html(
          `<pre><code class="language-${escapeAttr(str(fields.language))}">${escapeText(str(fields.code))}</code></pre>`
        ),
      ];
    case "ctaBannerInline": {
      const nodes: (ContentNode | null)[] = [
        heading(3, str(fields.heading)),
        paragraph(str(fields.eyebrow)),
        paragraph(str(fields.description)),
      ];

      for (const action of (fields.actions as Array<Record<string, unknown>> | undefined) ?? []) {
        nodes.push(linkToContentNode(action as LinkValue, linkCtx));
      }

      return nodes;
    }
    default:
      return [];
  }
}

function uploadNode(node: LexNode, ctx: RichTextResolveCtx): ContentNode | null {
  const media: Upload | null = isRecord(node.value)
    ? (node.value as Upload)
    : ((ctx.docs.get("media", node.value as string | number) as Upload | undefined) ?? null);

  return image(media?.url, media?.alt);
}

function walkNode(node: LexNode, ctx: RichTextResolveCtx): (ContentNode | null)[] {
  switch (node.type) {
    case "heading": {
      const tag = HEADING_TAGS.has(str(node.tag)) ? str(node.tag) : "h2";
      const inner = serializeInline(childrenOf(node), ctx);
      return inner.trim() ? [html(`<${tag}>${inner}</${tag}>`)] : [];
    }
    case "paragraph": {
      const inner = serializeInline(childrenOf(node), ctx);
      return inner.trim() ? [html(`<p>${inner}</p>`)] : [];
    }
    case "quote": {
      const inner = serializeInline(childrenOf(node), ctx);
      return inner.trim() ? [html(`<blockquote>${inner}</blockquote>`)] : [];
    }
    case "list": {
      const listHtml = serializeList(node, ctx);
      return /<li>.+<\/li>/u.test(listHtml) ? [html(listHtml)] : [];
    }
    case "upload":
      return [uploadNode(node, ctx)];
    case "block":
      return isRecord(node.fields) ? expandBlock(node.fields, ctx) : [];
    case "horizontalrule":
    case "linebreak":
    case "tab":
      return [];
    default: {
      const text = textOf(node).trim();
      if (text) return [paragraph(text)];
      return childrenOf(node).flatMap((child) => walkNode(child, ctx));
    }
  }
}

export function richTextToContent(value: unknown, ctx: RichTextResolveCtx): ContentNode[] {
  if (!isRecord(value)) return [];

  const root = value.root;
  if (!isRecord(root)) return [];

  const children = Array.isArray(root.children)
    ? (root.children.filter(isRecord) as LexNode[])
    : [];

  return compact(children.flatMap((child) => walkNode(child, ctx)));
}
