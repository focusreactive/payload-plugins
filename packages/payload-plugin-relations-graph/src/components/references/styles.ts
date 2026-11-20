/** Scoped under `.rg-refs`; colours come from Payload's theme variables so light and dark both work. */
export const REFERENCES_CSS = `
.rg-refs__trigger { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid var(--theme-elevation-150); border-radius: 14px; background: var(--theme-elevation-50); color: var(--theme-elevation-800); font: inherit; font-size: 12px; line-height: 1; white-space: nowrap; cursor: pointer; }
.rg-refs__trigger:hover { background: var(--theme-elevation-100); border-color: var(--theme-elevation-250); }
.rg-refs__trigger:focus-visible { outline: 2px solid var(--theme-elevation-800); outline-offset: 2px; }
.rg-refs__trigger--used { border-color: var(--theme-elevation-300); color: var(--theme-text); }
.rg-refs__count { font-weight: 600; font-variant-numeric: tabular-nums; }
.rg-refs__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--theme-elevation-300); }
.rg-refs__trigger--used .rg-refs__dot { background: var(--theme-success-500, #16a34a); }
.rg-refs__trigger--error .rg-refs__dot { background: var(--theme-error-500, #dc2626); }
.rg-refs { display: flex; flex-direction: column; gap: 20px; padding-bottom: 32px; font-size: 14px; }
.rg-refs__toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.rg-refs__summary { margin: 0; color: var(--theme-elevation-600); }
.rg-refs__refresh { margin-left: auto; height: 28px; padding: 0 10px; border: 1px solid var(--theme-elevation-150); border-radius: 4px; background: var(--theme-elevation-50); color: var(--theme-text); font: inherit; font-size: 12px; cursor: pointer; }
.rg-refs__refresh:hover { background: var(--theme-elevation-100); }
.rg-refs__refresh:disabled { opacity: 0.6; cursor: default; }
.rg-refs__source { border: 1px solid var(--theme-elevation-150); border-radius: 6px; background: var(--theme-elevation-0); overflow: hidden; }
.rg-refs__source-head { display: flex; align-items: center; gap: 8px; margin: 0; padding: 10px 14px; border-bottom: 1px solid var(--theme-elevation-100); background: var(--theme-elevation-50); font-size: 15px; font-weight: 600; }
.rg-refs__field { padding: 10px 14px; }
.rg-refs__field + .rg-refs__field { border-top: 1px solid var(--theme-elevation-100); }
.rg-refs__field-head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 6px; }
.rg-refs__path { font-family: var(--font-mono, monospace); font-size: 12px; color: var(--theme-elevation-800); overflow-wrap: anywhere; }
.rg-refs__badge { padding: 1px 6px; border-radius: 3px; background: var(--theme-elevation-100); color: var(--theme-elevation-700); font-size: 11px; }
.rg-refs__badge--draft { background: var(--theme-warning-100, #fef3c7); color: var(--theme-warning-800, #92400e); }
.rg-refs__field-count { margin-left: auto; color: var(--theme-elevation-500); font-size: 12px; font-variant-numeric: tabular-nums; }
.rg-refs__docs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.rg-refs__doc { display: flex; align-items: center; gap: 8px; min-width: 0; }
.rg-refs__doc a { color: var(--theme-text); text-decoration: underline; text-decoration-color: var(--theme-elevation-300); text-underline-offset: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rg-refs__doc a:hover { text-decoration-color: currentColor; }
.rg-refs__more, .rg-refs__note { margin: 6px 0 0; color: var(--theme-elevation-500); font-size: 12px; }
.rg-refs__error { margin: 0; color: var(--theme-error-500, #dc2626); font-size: 13px; }
.rg-refs__empty { margin: 0; padding: 24px; border: 1px dashed var(--theme-elevation-200); border-radius: 6px; color: var(--theme-elevation-600); text-align: center; }
.rg-refs__footnote { margin: 0; color: var(--theme-elevation-500); font-size: 12px; }
`;
