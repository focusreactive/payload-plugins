/** Scoped under `.rg`; colours come from Payload's theme variables so light and dark both work. */
export const GRAPH_CSS = `
.rg { --rg-rel: #3b82f6; --rg-upload: #8b5cf6; --rg-join: #d97706; display: flex; flex-direction: column; gap: 12px; padding-bottom: 24px; }
.rg__header { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.rg__title { margin: 0; font-size: 26px; line-height: 1.2; }
.rg__summary { color: var(--theme-elevation-500); font-size: 13px; }
.rg__toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-left: auto; }
.rg__search { height: 32px; padding: 0 10px; min-width: 180px; border: 1px solid var(--theme-elevation-150); border-radius: 4px; background: var(--theme-input-bg, var(--theme-elevation-0)); color: var(--theme-text); font: inherit; font-size: 13px; }
.rg__btn { height: 32px; padding: 0 10px; border: 1px solid var(--theme-elevation-150); border-radius: 4px; background: var(--theme-elevation-50); color: var(--theme-text); font: inherit; font-size: 13px; cursor: pointer; white-space: nowrap; }
.rg__btn:hover { background: var(--theme-elevation-100); }
.rg__btn[aria-pressed="true"] { background: var(--theme-elevation-800); border-color: var(--theme-elevation-800); color: var(--theme-elevation-0); }
.rg__body { display: flex; gap: 12px; align-items: stretch; height: calc(100vh - 230px); min-height: 460px; }
.rg__stage { position: relative; flex: 1 1 auto; min-width: 0; border: 1px solid var(--theme-elevation-150); border-radius: 6px; background: var(--theme-elevation-0); overflow: hidden; }
.rg__svg { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; user-select: none; }
.rg__svg--panning { cursor: grabbing; }
.rg__grid { fill: var(--theme-elevation-150); }
.rg__node { cursor: pointer; }
.rg__node-box { fill: var(--theme-elevation-50); stroke: var(--theme-elevation-250); stroke-width: 1; }
.rg__node--global .rg__node-box { stroke-dasharray: 5 4; }
.rg__node--selected .rg__node-box { stroke: var(--theme-text); stroke-width: 2; }
.rg__node-stripe { fill: var(--rg-rel); }
.rg__node--upload .rg__node-stripe { fill: var(--rg-upload); }
.rg__node--global .rg__node-stripe { fill: var(--theme-elevation-400); }
.rg__node-label { fill: var(--theme-text); font-size: 14px; font-weight: 600; }
.rg__node-meta { fill: var(--theme-elevation-500); font-size: 11px; }
.rg__edge { fill: none; stroke: var(--rg-rel); stroke-width: 1.5; }
.rg__edge--upload { stroke: var(--rg-upload); }
.rg__edge--join { stroke: var(--rg-join); stroke-dasharray: 6 4; }
.rg__edge-label { fill: var(--theme-elevation-600); font-size: 11px; paint-order: stroke; stroke: var(--theme-elevation-0); stroke-width: 4px; stroke-linejoin: round; }
.rg__dim { opacity: 0.14; }
.rg__legend { position: absolute; left: 10px; bottom: 10px; display: flex; flex-wrap: wrap; gap: 12px; padding: 6px 10px; border: 1px solid var(--theme-elevation-150); border-radius: 4px; background: var(--theme-elevation-0); color: var(--theme-elevation-600); font-size: 11px; pointer-events: none; }
.rg__legend-item { display: inline-flex; align-items: center; gap: 6px; }
.rg__legend-line { width: 22px; height: 0; border-top: 2px solid var(--rg-rel); }
.rg__legend-line--upload { border-color: var(--rg-upload); }
.rg__legend-line--join { border-color: var(--rg-join); border-top-style: dashed; }
.rg__zoom { position: absolute; right: 10px; bottom: 10px; display: flex; gap: 4px; }
.rg__zoom .rg__btn { min-width: 32px; padding: 0 8px; }
.rg__empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--theme-elevation-500); }
.rg__panel { flex: 0 0 320px; max-width: 40%; overflow: auto; padding: 16px; border: 1px solid var(--theme-elevation-150); border-radius: 6px; background: var(--theme-elevation-0); font-size: 13px; }
.rg__panel h3 { margin: 0 0 2px; font-size: 18px; }
.rg__panel h4 { margin: 18px 0 6px; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--theme-elevation-500); }
.rg__panel-slug { color: var(--theme-elevation-500); font-family: var(--font-mono, monospace); font-size: 12px; }
.rg__badges { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.rg__badge { padding: 1px 6px; border-radius: 3px; background: var(--theme-elevation-100); color: var(--theme-elevation-800); font-size: 11px; }
.rg__rel-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.rg__rel { padding: 6px 8px; border: 1px solid var(--theme-elevation-100); border-radius: 4px; }
.rg__rel-path { font-family: var(--font-mono, monospace); font-size: 12px; overflow-wrap: anywhere; }
.rg__rel-target { all: unset; cursor: pointer; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
.rg__rel-meta { color: var(--theme-elevation-500); font-size: 11px; margin-top: 2px; }
.rg__muted { color: var(--theme-elevation-500); }
.rg__panel-link { display: inline-block; margin-top: 12px; }
@media (max-width: 900px) { .rg__body { flex-direction: column; height: auto; } .rg__stage { height: 60vh; } .rg__panel { flex: none; max-width: none; } }
`;
