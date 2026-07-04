const UNPREFIXED_DECLARATION =
  /(?:^|[{;])\s*--(?:color-|spacing|radius-|animate-|font-|text-|tracking-|shadow-|default-)/mu;
const UNPREFIXED_REFERENCE = /var\(--(?:color-|spacing|radius-)/u;
const UNPREFIXED_SELECTOR = /^\s*\.(?!franalytics(?:\\:|-))[A-Za-z]/mu;

export function verifyCss(css: string): string[] {
  const errors: string[] = [];
  if (!css.includes(".franalytics\\:")) {
    errors.push(
      "expected prefixed utility selectors (.franalytics\\:*) — prefix(franalytics) did not apply"
    );
  }
  if (!css.includes("--franalytics-color-")) {
    errors.push(
      "expected prefixed theme variables (--franalytics-color-*) — prefix(franalytics) did not apply"
    );
  }
  const declaration = css.match(UNPREFIXED_DECLARATION);
  if (declaration) {
    errors.push(`unprefixed design-token declaration in output: "${declaration[0].trim()}"`);
  }
  const reference = css.match(UNPREFIXED_REFERENCE);
  if (reference) {
    errors.push(`unprefixed design-token reference in output: "${reference[0]}"`);
  }
  const selector = css.match(UNPREFIXED_SELECTOR);
  if (selector) {
    errors.push(`class selector without franalytics namespace in output: "${selector[0].trim()}"`);
  }
  return errors;
}

const UNPREFIXED_CLASSNAME = /className:\s*["'](?!["']|franalytics[:-])/u;

export function verifyJs(code: string, fileName: string): string[] {
  if (UNPREFIXED_CLASSNAME.test(code)) {
    return [
      `${fileName}: className string literal without franalytics prefix survived the codemod`,
    ];
  }
  return [];
}
