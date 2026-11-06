import { MAX_LINKED_HREFS, MAX_LINKED_HREF_LENGTH, MAX_LINK_TEXT_CHARS } from "../../../constants";

export interface DocumentContent {
  text: string;
  hrefs: string[];
}

const BLOCK_SELECTOR =
  "address,article,aside,blockquote,dd,div,dt,figcaption,h1,h2,h3,h4,h5,h6,li,p,pre,section,td,th";

function readText(body: HTMLElement): string {
  for (const lineBreak of body.querySelectorAll("br")) lineBreak.replaceWith(" ");
  for (const block of body.querySelectorAll(BLOCK_SELECTOR)) block.append(" ");

  return (body.textContent ?? "").replace(/\s+/gu, " ").trim().slice(0, MAX_LINK_TEXT_CHARS);
}

function isSendableHref(href: string): boolean {
  return href.length > 0 && href.length <= MAX_LINKED_HREF_LENGTH;
}

export function readContent(html: string): DocumentContent {
  const { body } = new DOMParser().parseFromString(html, "text/html");

  const hrefs = [...body.querySelectorAll("a[href]")]
    .map((anchor) => anchor.getAttribute("href") ?? "")
    .filter(isSendableHref);

  return { text: readText(body), hrefs: [...new Set(hrefs)].slice(0, MAX_LINKED_HREFS) };
}
