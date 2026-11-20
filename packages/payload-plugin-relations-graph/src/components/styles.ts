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
.rg { --rg-warning: var(--theme-warning-500, #d97706); --rg-info: var(--theme-elevation-400); }
.rg__edge--unused { stroke-dasharray: 2 4; }
.rg__node--flagged-warning .rg__node-box { stroke: var(--rg-warning); stroke-width: 2.5; }
.rg__node--flagged-info .rg__node-box { stroke: var(--theme-text); stroke-width: 2; }
.rg__node-warning { fill: var(--rg-warning); }
.rg__count { display: inline-block; min-width: 18px; margin-left: 6px; padding: 0 5px; border-radius: 9px; background: var(--theme-elevation-150); color: var(--theme-text); font-size: 11px; line-height: 18px; text-align: center; }
.rg__count--warning { background: var(--rg-warning); color: #fff; }
.rg__btn[aria-pressed="true"] .rg__count { background: var(--theme-elevation-0); color: var(--theme-text); }
.rg__btn[aria-busy="true"] { cursor: progress; }
.rg__btn--small { height: 26px; font-size: 12px; }
.rg__status { position: absolute; left: 10px; top: 10px; display: flex; align-items: center; gap: 8px; max-width: calc(100% - 20px); padding: 4px 10px; border: 1px solid var(--theme-elevation-150); border-radius: 4px; background: var(--theme-elevation-0); color: var(--theme-elevation-600); font-size: 12px; }
.rg__status--error { border-color: var(--theme-error-500, #dc2626); color: var(--theme-error-500, #dc2626); }
.rg__link-btn { all: unset; cursor: pointer; color: var(--theme-text); text-decoration: underline; text-underline-offset: 2px; }
.rg__panel-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.rg__icon-btn { all: unset; cursor: pointer; padding: 0 6px; font-size: 20px; line-height: 1; color: var(--theme-elevation-500); }
.rg__icon-btn:hover { color: var(--theme-text); }
.rg__back { all: unset; cursor: pointer; display: inline-block; margin-bottom: 8px; color: var(--theme-elevation-600); font-size: 12px; }
.rg__back:hover { color: var(--theme-text); }
.rg__insights-intro { margin: 4px 0 0; font-size: 12px; }
.rg__callout { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 10px; border: 1px dashed var(--theme-elevation-250); border-radius: 4px; color: var(--theme-elevation-700); font-size: 12px; }
.rg__findings { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.rg__finding { all: unset; box-sizing: border-box; cursor: pointer; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; width: 100%; padding: 7px 9px 7px 11px; border: 1px solid var(--theme-elevation-100); border-left: 3px solid var(--rg-info); border-radius: 4px; }
.rg__finding:hover { background: var(--theme-elevation-50); }
.rg__finding:focus-visible { outline: 2px solid var(--theme-text); outline-offset: 1px; }
.rg__finding--warning { border-left-color: var(--rg-warning); }
.rg__finding--active { background: var(--theme-elevation-50); border-color: var(--theme-elevation-250); }
.rg__finding--warning.rg__finding--active { border-left-color: var(--rg-warning); }
.rg__finding-title { flex: 1 1 180px; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }
.rg__finding-tag { padding: 0 5px; border-radius: 3px; background: var(--theme-elevation-100); color: var(--theme-elevation-600); font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
.rg__finding-detail { flex-basis: 100%; color: var(--theme-elevation-700); line-height: 1.45; overflow-wrap: anywhere; }
.rg__data-summary { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; padding: 8px 10px; border-radius: 4px; background: var(--theme-elevation-50); }
.rg__finding code { padding: 0 3px; border-radius: 3px; background: var(--theme-elevation-100); font-family: var(--font-mono, monospace); font-size: 0.92em; font-weight: 400; }
.rg__small { font-size: 11px; }
.rg__rel-usage { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 11px; color: var(--theme-elevation-700); }
.rg__meter { flex: 0 0 48px; height: 4px; border-radius: 2px; background: var(--theme-elevation-150); overflow: hidden; }
.rg__meter > span { display: block; height: 100%; background: var(--theme-elevation-700); }
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
