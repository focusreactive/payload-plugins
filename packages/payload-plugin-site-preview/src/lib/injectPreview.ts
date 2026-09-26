import { FRAME_ENDPOINT, PREVIEW_MESSAGE } from "./constants.js";

const attribute = (value: string) => value.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;");

// Root-relative: a relative path would resolve against `<base>`, the proxied site, and miss.
const frameTags = (api: string, scrollOffset = "", unsaved = true) => {
  const frame = `${api}${FRAME_ENDPOINT}`;
  return `<link rel="stylesheet" href="${frame}/frame.css">
<script src="${frame}/click-to-edit.js" data-message="${PREVIEW_MESSAGE}" data-scroll-offset="${attribute(scrollOffset)}"></script>${
    unsaved ? `\n<script src="${frame}/unsaved-edits.js"></script>` : ""
  }`;
};

// `base` sends the page's own relative urls back through the CMS. The frame files go before the
// last `</body>`, not the first: a template may carry the string inside an inline script.
export const injectPreview = (
  html: string,
  {
    base,
    api,
    scrollOffset,
    unsaved,
  }: { base: string; api: string; scrollOffset?: string; unsaved?: boolean }
) => {
  const withBase = html.replace(
    /<head(\s[^>]*)?>/iu,
    (tag) => `${tag}\n<base href="${attribute(base)}">`
  );
  const end = withBase.toLowerCase().lastIndexOf("</body>");
  return end < 0
    ? withBase
    : `${withBase.slice(0, end)}${frameTags(api, scrollOffset, unsaved)}\n${withBase.slice(end)}`;
};
