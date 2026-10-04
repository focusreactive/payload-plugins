import { markdownToPlainText } from "@/lib/markdown/plainText";

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replaceAll(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");
}

/** First prose paragraph of a Markdown body as plain text, cut at a word boundary. */
export function firstParagraph(markdown: string, max = 220): string {
  const block =
    markdown
      .split(/\n{2,}/u)
      .map((part) => part.trim())
      .find((part) => part && !/^(#|[-*+]\s|\d+\.\s|\||>|!\[|`)/u.test(part)) ?? "";
  const text = markdownToPlainText(block);
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max).replace(/\s+\S*$/u, "")}…`;
}

/** 09:00 Europe/London on the given day, as an ISO timestamp. */
export function londonMorning(date: string): string {
  const utcGuess = new Date(`${date}T09:00:00Z`);
  const offsetName =
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", timeZoneName: "shortOffset" })
      .formatToParts(utcGuess)
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const hours = Number(/GMT([+-]\d+)/u.exec(offsetName)?.[1] ?? 0);
  return new Date(utcGuess.getTime() - hours * 3_600_000).toISOString();
}
