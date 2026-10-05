// HTML → Lexical for the simple rich text editor: <p>, <ul>/<ol>, <strong>/<em>, the styled spans
// Payload writes for underline and strikethrough, <a>, <br>, and the sprite <svg> an icon block
// serializes to. Plain JS with no node imports, so the migration scripts and the admin's json form
// share it.
//
// This is one half of a round trip — Payload's own converter writes the html, this reads it back,
// and the json field keeps nothing else. So a tag written here and not read there is not a gap in a
// parser: it is content that disappears the next time an editor opens the field.

export const decode = (value: string) =>
  value
    .replace(/&#x26;|&amp;/g, "&")
    .replace(/&#x27;|&rsquo;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");

type Node = { tag?: string; attrs?: string; text?: string; children?: Node[] };

const VOID = new Set(["br", "img", "hr"]);

const parseHtml = (html: string): Node[] => {
  const root: Node = { children: [] };
  const stack: Node[] = [root];
  const re = /<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z0-9]+)([^>]*?)\/?>|([^<]+)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[1]) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === m[1].toLowerCase()) {
          stack.length = i;
          break;
        }
      }
    } else if (m[2]) {
      const tag = m[2].toLowerCase();
      const node: Node = { tag, attrs: m[3] || "", children: [] };
      top.children!.push(node);
      if (!VOID.has(tag)) stack.push(node);
    } else if (m[4]) {
      top.children!.push({ text: decode(m[4]) });
    }
  }
  return root.children!;
};

export const textNode = (text: string, format: number) => ({
  type: "text",
  text,
  detail: 0,
  format,
  mode: "normal",
  style: "",
  version: 1,
});

const attribute = (attrs = "", name: string) =>
  attrs.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`))?.[1];
const href = (attrs = "") => attribute(attrs, "href") || "";

// Read, never guessed: Payload writes `target` exactly when the link opens in a new tab and leaves
// it off otherwise, so its absence is an answer. Html from somewhere else may mean nothing by it —
// that is for whoever knows where the html came from, not for a parser.
const opensNewTab = (attrs?: string) => attribute(attrs, "target") === "_blank";

const FORMAT: Record<string, number> = {
  strong: 1,
  b: 1,
  em: 2,
  i: 2,
  s: 4,
  strike: 4,
  del: 4,
  u: 8,
  code: 16,
};

// Payload writes underline and strikethrough as a styled span rather than as a tag — see
// `TextHTMLConverter` in @payloadcms/richtext-lexical. Html out of Hygraph uses the tags in the
// table above, and the two have to read back the same.
const styleFormat = (attrs?: string) => {
  const style = attribute(attrs, "style") || "";
  return (style.includes("underline") ? 8 : 0) | (style.includes("line-through") ? 4 : 0);
};

const hex = (bytes: number) =>
  Array.from({ length: bytes * 2 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

// Lexical names a block it inserts itself. The name is not in the html, so it is made again on
// every read — nothing downstream keeps it.
export const inlineBlock = (blockType: string) => ({
  type: "inlineBlock",
  fields: { id: hex(12), blockType },
  version: 1,
});

const inline = (nodes: Node[], format = 0): any[] =>
  nodes.flatMap((node) => {
    if (node.text !== undefined) return node.text ? [textNode(node.text, format)] : [];
    const tag = node.tag!;
    if (tag === "br") return [{ type: "linebreak", version: 1 }];
    if (tag === "a") {
      const children = inline(node.children || [], format);
      if (!children.length) return [];
      const url = href(node.attrs);
      return [
        {
          type: "link",
          version: 3,
          direction: "ltr",
          format: "",
          indent: 0,
          fields: { linkType: "custom", url, newTab: opensNewTab(node.attrs) },
          children,
        },
      ];
    }
    return inline(node.children || [], format | (FORMAT[tag] || 0) | styleFormat(node.attrs));
  });

const element = (type: string, children: any[], rest: Record<string, unknown> = {}) => ({
  type,
  direction: "ltr",
  format: "",
  indent: 0,
  version: 1,
  ...rest,
  children,
});
const paragraph = (children: any[]) => element("paragraph", children, { textFormat: 0 });

// Which block nodes the editor on the far side can hold. Everything, by default — that is what
// Payload's own converters write, and reading back less than was written loses content. A field
// built on `simpleRichTextEditor` has none of these three, and cannot be handed a node it has no
// feature for, so there a heading reads as a bold paragraph, a quote as a plain one and a rule not
// at all.
export type Holds = { headings?: boolean; quotes?: boolean; rules?: boolean };
export const SIMPLE: Holds = { headings: false, quotes: false, rules: false };

export const listItem = (children: any[], value: number) => ({
  type: "listitem",
  direction: "ltr",
  format: "",
  indent: 0,
  version: 1,
  value,
  checked: undefined,
  children,
});

const NESTED = (node: Node) => node.tag === "ul" || node.tag === "ol";
const fills = (node: Node) => Boolean(node.tag || (node.text || "").trim());

// Hygraph nests a <ul> in a <li> in every faq answer and the editor has no nesting: lift the inner items, keep the item's own text.
const listItems = (nodes: Node[]): Node[] =>
  nodes.flatMap((node) => {
    if (node.tag !== "li") return [];
    const children = node.children || [];
    const nested = children.filter(NESTED);
    if (!nested.length) return [node];

    const own = children.filter((child) => !NESTED(child));
    return [
      ...(own.some(fills) ? [{ ...node, children: own }] : []),
      ...listItems(nested.flatMap((list) => list.children || [])),
    ];
  });

const list = (node: Node) => {
  const items = listItems(node.children || []);
  if (!items.length) return null;
  return {
    type: "list",
    direction: "ltr",
    format: "",
    indent: 0,
    version: 1,
    listType: node.tag === "ol" ? "number" : "bullet",
    tag: node.tag === "ol" ? "ol" : "ul",
    start: 1,
    children: items.map((item, index) => listItem(inline(item.children || []), index + 1)),
  };
};

const BLOCK = new Set([
  "p",
  "ul",
  "ol",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "div",
  "blockquote",
  "hr",
]);
const HEADING = /^h[1-6]$/;

const blank = (node: any) =>
  node.type === "linebreak" || (node.type === "text" && !node.text.trim());

// A paragraph neither starts nor ends on a line break or on the whitespace between tags.
const trimmed = (children: any[]) => {
  const items = [...children];
  while (items.length && blank(items[0])) items.shift();
  while (items.length && blank(items[items.length - 1])) items.pop();
  if (items[0]?.type === "text") items[0] = { ...items[0], text: items[0].text.trimStart() };
  const last = items.length - 1;
  if (items[last]?.type === "text")
    items[last] = { ...items[last], text: items[last].text.trimEnd() };
  return items;
};

// Loose text and inline tags between blocks (`a<br/>b`, `text <a>link</a>`) make one paragraph,
// a <br> a line break inside it; only a block tag starts a node of its own.
const blocks = (nodes: Node[], holds: Holds): any[] => {
  const out: any[] = [];
  let run: Node[] = [];
  const push = (children: any[], keepEmpty = false) => {
    const content = trimmed(children);
    if (content.length) out.push(paragraph(content));
    // `<p><br /></p>` is how an empty paragraph is written — the blank line an author left between
    // two others. Dropped, the gap closes the next time the field is opened.
    else if (keepEmpty) out.push(paragraph([]));
  };
  const flush = () => {
    push(inline(run));
    run = [];
  };

  for (const node of nodes) {
    const tag = node.tag;
    if (!tag || !BLOCK.has(tag)) {
      run.push(node);
      continue;
    }
    flush();
    const held = inline(node.children || []);
    if (tag === "ul" || tag === "ol") out.push(...[list(node)].filter(Boolean));
    else if (tag === "div") out.push(...blocks(node.children || [], holds));
    else if (tag === "hr") {
      if (holds.rules !== false) out.push({ type: "horizontalrule", version: 1 });
    } else if (tag === "blockquote" && holds.quotes !== false)
      out.push(element("quote", trimmed(held)));
    else if (HEADING.test(tag) && holds.headings !== false)
      out.push(element("heading", trimmed(held), { tag }));
    // Narrowed to what the editor holds: a heading is still the loudest line on the page, so it is
    // read as a bold paragraph, and a quote as a plain one.
    else if (HEADING.test(tag)) push(inline(node.children || [], 1));
    else push(held, tag === "p" && held.some((child) => child.type === "linebreak"));
  }
  flush();
  return out;
};

export const root = (children: any[]) => ({
  root: { type: "root", direction: "ltr", format: "", indent: 0, version: 1, children },
});

// Null when empty — an empty root makes the admin show a document that was never authored.
export const htmlToLexical = (html?: string | null, holds: Holds = {}): any => {
  const children = blocks(parseHtml(html || ""), holds);
  return children.length ? root(children) : null;
};
