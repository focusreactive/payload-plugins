const UNPREFIXED_DECLARATION =
  /(?:^|[{;])\s*--(?:color-|spacing|radius-|animate-|font-|text-|tracking-|shadow-|default-)/mu;
const UNPREFIXED_REFERENCE = /var\(--(?:color-|spacing|radius-)/u;
const UNPREFIXED_SELECTOR = /^\s*\.(?!frcomments(?:\\:|-))[A-Za-z]/mu;

export function verifyCss(css: string): string[] {
  const errors: string[] = [];
  if (!css.includes(".frcomments\\:")) {
    errors.push(
      "expected prefixed utility selectors (.frcomments\\:*) — prefix(frcomments) did not apply"
    );
  }
  if (!css.includes("--frcomments-color-")) {
    errors.push(
      "expected prefixed theme variables (--frcomments-color-*) — prefix(frcomments) did not apply"
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
    errors.push(`class selector without frcomments namespace in output: "${selector[0].trim()}"`);
  }
  return errors;
}

const UNPREFIXED_CLASSNAME = /className:\s*["'](?!["']|frcomments[:-])/u;

export function verifyJs(code: string, fileName: string): string[] {
  if (UNPREFIXED_CLASSNAME.test(code)) {
    return [`${fileName}: className string literal without frcomments prefix survived the codemod`];
  }
  return [];
}
