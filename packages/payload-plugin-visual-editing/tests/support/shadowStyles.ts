const RULES = /(?<selectors>[^{}]+)\{(?<block>[^{}]*)\}/gu;

const styleOf = (host: Element | null): string =>
  host?.shadowRoot?.querySelector("style")?.textContent ?? "";

export const declarationsFor = (host: Element | null, selector: string): string[] =>
  [...styleOf(host).matchAll(RULES)]
    .filter(({ groups }) => groups?.selectors?.trim() === selector)
    .flatMap(({ groups }) => (groups?.block ?? "").split(";"))
    .map((declaration) => declaration.trim().replaceAll(/\s+/gu, " "))
    .filter(Boolean);
