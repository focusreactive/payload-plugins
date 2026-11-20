/**
 * Scoped under `.rg`. The header and controls reuse Payload's own `list-header`, `search-bar`
 * and `search-filter` classes; everything else is built from Payload theme tokens only
 * (`--theme-*`, `--base`, `--style-radius-*`), so light and dark both follow the admin theme.
 */
export const GRAPH_CSS = `
.rg {
  --rg-rel: var(--theme-success-500);
  --rg-upload: var(--theme-elevation-500);
  --rg-join: var(--theme-warning-600);
  --rg-warning: var(--theme-warning-600);
  --rg-border: var(--theme-elevation-150);
  display: flex;
  flex-direction: column;
  gap: var(--base);
  padding-bottom: calc(var(--base) * 2);
}
.rg__header { margin-top: calc(var(--base) * 0.5); }
.rg__header .list-header__title-and-actions { align-items: baseline; }
.rg__summary { color: var(--theme-elevation-500); }
.rg__controls { grid-template-columns: auto 1fr auto; }
.rg__actions { flex-wrap: wrap; justify-content: flex-end; }
.rg__toggle { white-space: nowrap; }
.rg__divider { align-self: stretch; width: 1px; margin: calc(var(--base) * 0.2); background: var(--theme-elevation-150); }
.rg__count { display: inline-block; min-width: calc(var(--base) * 0.9); margin-inline-start: calc(var(--base) * 0.3); padding: 0 calc(var(--base) * 0.25); border-radius: var(--style-radius-l); background: var(--theme-elevation-200); color: var(--theme-elevation-800); font-size: 11px; line-height: calc(var(--base) * 0.9); text-align: center; }
.pill--style-dark .rg__count { background: var(--theme-elevation-600); color: var(--theme-elevation-0); }
.rg__count--warning, .pill--style-dark .rg__count--warning { background: var(--rg-warning); color: var(--theme-elevation-0); }

.rg__body { display: flex; gap: var(--base); align-items: stretch; height: calc(100vh - 260px); min-height: 460px; }
.rg__stage { position: relative; flex: 1 1 auto; min-width: 0; border: 1px solid var(--rg-border); border-radius: var(--style-radius-m); background: var(--theme-bg, var(--theme-elevation-0)); overflow: hidden; }
.rg__svg { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; user-select: none; }
.rg__svg--panning { cursor: grabbing; }
.rg__grid { fill: var(--theme-elevation-150); }

.rg__node { cursor: pointer; }
.rg__node-box { fill: var(--theme-elevation-50); stroke: var(--theme-elevation-200); stroke-width: 1; }
.rg__node:hover .rg__node-box { stroke: var(--theme-elevation-400); }
.rg__node--global .rg__node-box { stroke-dasharray: 5 4; }
.rg__node--selected .rg__node-box { stroke: var(--theme-text); stroke-width: 2; }
.rg__node-stripe { fill: var(--rg-rel); }
.rg__node--upload .rg__node-stripe { fill: var(--rg-upload); }
.rg__node--global .rg__node-stripe { fill: var(--theme-elevation-300); }
.rg__node-label { fill: var(--theme-text); font-family: var(--font-body); font-size: 14px; font-weight: 600; }
.rg__node-meta { fill: var(--theme-elevation-500); font-family: var(--font-body); font-size: 11px; }
.rg__node--flagged-warning .rg__node-box { stroke: var(--rg-warning); stroke-width: 2.5; }
.rg__node--flagged-info .rg__node-box { stroke: var(--theme-text); stroke-width: 2; }
.rg__node-warning { fill: var(--rg-warning); }
.rg__edge { fill: none; stroke: var(--rg-rel); stroke-width: 1.5; }
.rg__edge--upload { stroke: var(--rg-upload); }
.rg__edge--join { stroke: var(--rg-join); stroke-dasharray: 6 4; }
.rg__edge--unused { stroke-dasharray: 2 4; }
.rg__edge-label { fill: var(--theme-elevation-600); font-family: var(--font-body); font-size: 11px; paint-order: stroke; stroke: var(--theme-bg, var(--theme-elevation-0)); stroke-width: 4px; stroke-linejoin: round; }
.rg__dim { opacity: 0.14; }

.rg__legend { position: absolute; left: calc(var(--base) * 0.5); bottom: calc(var(--base) * 0.5); display: flex; flex-wrap: wrap; gap: calc(var(--base) * 0.6); padding: calc(var(--base) * 0.25) calc(var(--base) * 0.5); border-radius: var(--style-radius-s); background: var(--theme-elevation-50); color: var(--theme-elevation-600); font-size: 11px; pointer-events: none; }
.rg__legend-item { display: inline-flex; align-items: center; gap: calc(var(--base) * 0.3); }
.rg__legend-line { width: 22px; height: 0; border-top: 2px solid var(--rg-rel); }
.rg__legend-line--upload { border-color: var(--rg-upload); }
.rg__legend-line--join { border-color: var(--rg-join); border-top-style: dashed; }
.rg__zoom { position: absolute; right: calc(var(--base) * 0.5); bottom: calc(var(--base) * 0.5); display: flex; gap: calc(var(--base) * 0.2); }
.rg__zoom .btn { min-width: calc(var(--base) * 1.6); }
.rg__empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--theme-elevation-500); }
.rg__status { position: absolute; left: calc(var(--base) * 0.5); top: calc(var(--base) * 0.5); display: flex; align-items: center; gap: calc(var(--base) * 0.4); max-width: calc(100% - var(--base)); padding: calc(var(--base) * 0.2) calc(var(--base) * 0.5); border-radius: var(--style-radius-s); background: var(--theme-elevation-50); color: var(--theme-elevation-600); font-size: 12px; }
.rg__status--error { background: var(--theme-error-50); color: var(--theme-error-750); }
.rg__link-btn { all: unset; cursor: pointer; color: var(--theme-text); text-decoration: underline; text-underline-offset: 2px; }
.rg__link-btn:focus-visible { outline: 2px solid var(--theme-text); outline-offset: 2px; }

.rg__panel { flex: 0 0 340px; max-width: 40%; overflow: auto; padding: var(--base); border: 1px solid var(--rg-border); border-radius: var(--style-radius-m); background: var(--theme-bg, var(--theme-elevation-0)); }
.rg__panel h3 { margin: 0; }
.rg__panel h4 { margin: calc(var(--base) * 1.2) 0 calc(var(--base) * 0.4); font-size: 13px; font-weight: 600; color: var(--theme-elevation-800); }
.rg__panel-head { display: flex; align-items: center; justify-content: space-between; gap: calc(var(--base) * 0.5); }
.rg__close { flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: calc(var(--base) * 1.6); height: calc(var(--base) * 1.6); padding: 0; border: 0; border-radius: var(--style-radius-s); background: none; color: var(--theme-text); cursor: pointer; }
.rg__close:hover { background: var(--theme-elevation-100); }
.rg__close svg { width: calc(var(--base) * 2); height: calc(var(--base) * 2); }
.rg__back { all: unset; cursor: pointer; display: inline-block; margin-bottom: calc(var(--base) * 0.4); color: var(--theme-elevation-600); font-size: 12px; }
.rg__back:hover { color: var(--theme-text); }
.rg__panel-slug { color: var(--theme-elevation-500); font-family: var(--font-mono); font-size: 12px; }
.rg__badges { display: flex; flex-wrap: wrap; gap: calc(var(--base) * 0.2); margin-top: calc(var(--base) * 0.4); }
.rg__rel-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: calc(var(--base) * 0.3); }
.rg__rel { padding: calc(var(--base) * 0.4) calc(var(--base) * 0.5); border: 1px solid var(--theme-elevation-100); border-radius: var(--style-radius-s); }
.rg__rel-path { font-family: var(--font-mono); font-size: 12px; overflow-wrap: anywhere; }
.rg__rel-target { all: unset; cursor: pointer; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
.rg__rel-meta { color: var(--theme-elevation-500); font-size: 12px; margin-top: 2px; }
.rg__rel-usage { display: flex; align-items: center; gap: calc(var(--base) * 0.3); margin-top: calc(var(--base) * 0.2); font-size: 12px; color: var(--theme-elevation-700); }
.rg__meter { flex: 0 0 48px; height: 4px; border-radius: 2px; background: var(--theme-elevation-150); overflow: hidden; }
.rg__meter > span { display: block; height: 100%; background: var(--theme-elevation-700); }
.rg__muted { color: var(--theme-elevation-500); }
.rg__small { font-size: 12px; }
.rg__panel-link { display: inline-block; margin-top: calc(var(--base) * 0.6); }
.rg__data-summary { display: flex; flex-direction: column; gap: calc(var(--base) * 0.3); margin-top: calc(var(--base) * 0.6); padding: calc(var(--base) * 0.4) calc(var(--base) * 0.5); border-radius: var(--style-radius-s); background: var(--theme-elevation-50); }

.rg__insights .banner { margin: calc(var(--base) * 0.6) 0 0; }
.rg__banner { display: flex; flex-direction: column; align-items: flex-start; gap: calc(var(--base) * 0.3); }
.rg__insights-intro { margin: calc(var(--base) * 0.2) 0 0; font-size: 12px; }
.rg__loading { display: flex; flex-direction: column; gap: calc(var(--base) * 0.3); margin-top: calc(var(--base) * 0.6); }
.rg__findings { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: calc(var(--base) * 0.3); }
.rg__finding { all: unset; box-sizing: border-box; cursor: pointer; display: flex; flex-wrap: wrap; align-items: baseline; gap: calc(var(--base) * 0.2) calc(var(--base) * 0.4); width: 100%; padding: calc(var(--base) * 0.4) calc(var(--base) * 0.5); border: 1px solid var(--theme-elevation-100); border-inline-start: 3px solid var(--theme-elevation-300); border-radius: var(--style-radius-s); }
.rg__finding:hover { background: var(--theme-elevation-50); }
.rg__finding:focus-visible { outline: 2px solid var(--theme-text); outline-offset: 1px; }
.rg__finding--warning { border-inline-start-color: var(--rg-warning); }
.rg__finding--active { background: var(--theme-elevation-50); border-color: var(--theme-elevation-200); }
.rg__finding--warning.rg__finding--active { border-inline-start-color: var(--rg-warning); }
.rg__finding-title { flex: 1 1 180px; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }
.rg__finding-tag { padding: 0 calc(var(--base) * 0.25); border-radius: var(--style-radius-s); background: var(--theme-elevation-100); color: var(--theme-elevation-600); font-size: 11px; }
.rg__finding-detail { flex-basis: 100%; color: var(--theme-elevation-700); line-height: 1.45; overflow-wrap: anywhere; }
.rg__finding code { padding: 0 3px; border-radius: var(--style-radius-s); background: var(--theme-elevation-100); font-family: var(--font-mono); font-size: 0.92em; font-weight: 400; }

@media (max-width: 900px) {
  .rg__controls { grid-template-columns: auto 1fr; }
  .rg__body { flex-direction: column; height: auto; }
  .rg__stage { height: 60vh; }
  .rg__panel { flex: none; max-width: none; }
}
.rg--widget { height: 100%; gap: calc(var(--base) * 0.5); padding: 16px; background: var(--theme-elevation-50); border: 1px solid var(--theme-border-color); border-radius: var(--style-radius-m); }
.rg__widget-header { display: flex; flex-wrap: wrap; align-items: baseline; gap: calc(var(--base) * 0.5); }
.rg__widget-title { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.4; }
.rg__widget-link { margin-inline-start: auto; font-size: 13px; }
.rg__widget-svg { display: block; width: 100%; flex: 1 1 auto; min-height: 320px; max-height: 560px; border: 1px solid var(--rg-border); border-radius: var(--style-radius-s); background: var(--theme-bg, var(--theme-elevation-0)); }
.rg--widget .rg__node:hover .rg__node-box { stroke: var(--theme-text); }
`;
