/**
 * Layout only — buttons, pills, banners, shimmer and the document table are Payload's own
 * components and classes. Payload theme tokens only, so light and dark both follow the admin.
 */
export const REFERENCES_CSS = `
.rg-refs__trigger.btn { margin: 0; }
.rg-refs__trigger .rg-refs__count { font-variant-numeric: tabular-nums; }
.rg-refs { display: flex; flex-direction: column; gap: calc(var(--base) * 1.2); padding-bottom: calc(var(--base) * 2); }
.rg-refs__toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: calc(var(--base) * 0.6); }
.rg-refs__summary { margin: 0; color: var(--theme-elevation-500); }
.rg-refs__toolbar .btn { margin: 0 0 0 auto; }
.rg-refs__loading { display: flex; flex-direction: column; gap: calc(var(--base) * 0.4); }
.rg-refs__source { display: flex; flex-direction: column; gap: calc(var(--base) * 0.5); }
.rg-refs__source-head { display: flex; align-items: center; gap: calc(var(--base) * 0.4); margin: 0; font-size: var(--base-body-size, 13px); font-weight: 600; }
.rg-refs__source .table { margin-bottom: 0; }
.rg-refs__source .table th, .rg-refs__source .table td { min-width: 0; }
.rg-refs__col-doc { width: 50%; }
.rg-refs__doc { display: inline-flex; flex-wrap: wrap; align-items: center; gap: calc(var(--base) * 0.4); }
.rg-refs__doc a { color: var(--theme-text); }
.rg-refs__path { font-family: var(--font-mono); font-size: 12px; color: var(--theme-elevation-650); overflow-wrap: anywhere; }
.rg-refs__more { color: var(--theme-elevation-500); }
.rg-refs__source .banner { margin: 0; }
.rg-refs__footnote { margin: 0; color: var(--theme-elevation-500); font-size: 12px; }
`;
