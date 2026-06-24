import type { ContentNode } from "./nodes";

function escapeText(s: string): string {
  return s.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");
}

function serializeNode(node: ContentNode): string {
  switch (node.type) {
    case "heading":
      return `<h${node.level}>${escapeText(node.text)}</h${node.level}>`;
    case "paragraph":
      return `<p>${escapeText(node.text)}</p>`;
    case "link":
      return `<a href="${escapeAttr(node.href)}">${escapeText(node.text)}</a>`;
    case "image":
      return `<img src="${escapeAttr(node.src)}" alt="${escapeAttr(node.alt ?? "")}" />`;
    case "video":
      return node.poster ? `<video src="${escapeAttr(node.src)}" poster="${escapeAttr(node.poster)}"></video>` : `<video src="${escapeAttr(node.src)}"></video>`;
    case "html":
      return node.html;
    default:
      return "";
  }
}

export function serialize(nodes: ContentNode[]): string {
  return nodes.map(serializeNode).filter(Boolean).join("\n");
}
