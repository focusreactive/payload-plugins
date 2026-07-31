/**
 * Namespace re-export: callers `import { Locales }` and use `Locales.dedupe(...)`,
 * `Locales.resolveTargets(...)`, etc. Grouped this way (rather than loose named exports) so the domain
 * reads at the call site; `export * as` keeps each member individually tree-shakeable.
 */
export * as Locales from "./resolveLocales";
