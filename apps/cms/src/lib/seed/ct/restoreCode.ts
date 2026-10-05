import { JSDOM } from "jsdom";

/**
 * The content dump flattened code listings and tables into one-line paragraphs ("1 2 3 $ cat x
 * export A = b"). The scraped article HTML still has them intact, so each flattened paragraph is
 * matched to its HTML block by whitespace-free text and swapped for a fenced block or a GFM table.
 */

interface Restorable {
  /** Whitespace-free text the dump paragraph reduces to. */
  keys: string[];
  markdown: string;
}

const squash = (text: string) => text.replaceAll(/\s+/gu, "");

function fence(code: string, language: string): string {
  const body = code.replace(/\n+$/u, "");
  const ticks = body.includes("```") ? "````" : "```";
  return `${ticks}${language}\n${body}\n${ticks}`;
}

function languageOf(element: Element): string {
  const match = /(?:^|\s)language-([\w+-]+)/u.exec(
    `${element.className} ${element.querySelector("code")?.className ?? ""}`
  );
  return match?.[1] ?? "";
}

function cell(text: string): string {
  return text.replaceAll(/\s+/gu, " ").replaceAll("|", "\\|").trim();
}

function gfmTable(table: Element): Restorable | null {
  const rows = [...table.querySelectorAll("tr")].map((row) =>
    [...row.querySelectorAll("th, td")].map((c) => cell(c.textContent ?? ""))
  );
  const width = Math.max(0, ...rows.map((row) => row.length));
  if (rows.length < 2 || width === 0) {
    return null;
  }
  const pad = (row: string[]) => [...row, ...Array.from({ length: width - row.length }, () => "")];
  const [head, ...body] = rows.map(pad);
  const lines = [
    `| ${head.join(" | ")} |`,
    `| ${Array.from({ length: width }, () => "---").join(" | ")} |`,
    ...body.map((row) => `| ${row.join(" | ")} |`),
  ];
  return { keys: [squash(rows.flat().join(""))], markdown: lines.join("\n") };
}

function collect(html: string): Restorable[] {
  const { document } = new JSDOM(html).window;
  const found: Restorable[] = [];

  for (const table of document.querySelectorAll("table.highlighttable")) {
    const code = table.querySelector("td.code pre")?.textContent ?? "";
    const lineNumbers = squash(table.querySelector("td.linenos")?.textContent ?? "");
    const language = languageOf(table.closest(".highlight") ?? table);
    found.push({
      keys: [squash(code), lineNumbers + squash(code)],
      markdown: fence(code, language),
    });
  }
  for (const pre of document.querySelectorAll("pre")) {
    if (pre.closest("table.highlighttable")) {
      continue;
    }
    const code = pre.textContent ?? "";
    found.push({ keys: [squash(code)], markdown: fence(code, languageOf(pre)) });
  }
  for (const table of document.querySelectorAll("table")) {
    if (!table.classList.contains("highlighttable") && !table.closest("table.highlighttable")) {
      const restored = gfmTable(table);
      if (restored) {
        found.push(restored);
      }
    }
  }
  return found.filter((block) => block.keys.some((key) => key.length >= 8));
}

interface Segment {
  text: string;
  /** Already a fenced block or table: never searched again. */
  done: boolean;
}

/** Finds `key` in `text` ignoring whitespace; returns the original [from, to) range. */
function locate(text: string, key: string): [number, number] | null {
  let squashed = "";
  const index: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (!/\s/u.test(text[i]!)) {
      squashed += text[i];
      index.push(i);
    }
  }
  const at = squashed.indexOf(key);
  return at < 0 ? null : [index[at]!, index[at + key.length - 1]! + 1];
}

/** Widens [from, to) over inline-code backticks the dump wrapped some listings in. */
function widenOverBackticks(text: string, [from, to]: [number, number]): [number, number] {
  const left = text.slice(0, from).trimEnd();
  const right = text.slice(to).trimStart();
  return left.endsWith("`") && right.startsWith("`")
    ? [left.length - 1, text.length - right.length + 1]
    : [from, to];
}

function replaceFirst(segments: Segment[], block: Restorable): boolean {
  for (const [i, segment] of segments.entries()) {
    if (segment.done) {
      continue;
    }
    for (const key of [...block.keys].sort((a, b) => b.length - a.length)) {
      const range = locate(segment.text, key);
      if (range) {
        const [from, to] = widenOverBackticks(segment.text, range);
        segments.splice(
          i,
          1,
          { done: false, text: segment.text.slice(0, from).trimEnd() },
          { done: true, text: block.markdown },
          { done: false, text: segment.text.slice(to).trimStart() }
        );
        return true;
      }
    }
  }
  return false;
}

/** Returns the Markdown with flattened code and tables restored, plus how many were restored. */
export function restoreCodeAndTables(
  markdown: string,
  html: string
): { markdown: string; restored: number } {
  const segments: Segment[] = markdown
    .split(/(`{3,}[\s\S]*?`{3,})/u)
    .map((text, i) => ({ done: i % 2 === 1, text }));
  let restored = 0;
  for (const block of collect(html)) {
    if (replaceFirst(segments, block)) {
      restored++;
    }
  }
  return {
    markdown: segments
      .map((segment) => segment.text.trim())
      .filter(Boolean)
      .join("\n\n"),
    restored,
  };
}
