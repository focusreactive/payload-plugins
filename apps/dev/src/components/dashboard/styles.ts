/** Shared by all dashboard widgets; mirrors Payload's own `.card` and `.table` look. */
export const DASHBOARD_CSS = `
.dw { height: 100%; display: flex; flex-direction: column; gap: calc(var(--base) * 0.4); padding: 16px; background: var(--theme-elevation-50); border: 1px solid var(--theme-border-color); border-radius: var(--style-radius-m); color: var(--theme-text); }
.dw__label { margin: 0; font-size: 13px; font-weight: 500; line-height: 1.4; color: var(--theme-elevation-800); }
.dw__value { font-size: 36px; font-weight: 600; line-height: 1.1; font-variant-numeric: tabular-nums; }
.dw__value--muted { color: var(--theme-elevation-400); }
.dw__caption { font-size: 12px; line-height: 1.4; color: var(--theme-elevation-500); }
.dw__trend { font-weight: 600; color: var(--theme-elevation-800); }
.dw__link { margin-top: auto; padding-top: calc(var(--base) * 0.3); font-size: 13px; }
.dw__title { margin: 0 0 calc(var(--base) * 0.3); font-size: 15px; font-weight: 600; line-height: 1.4; }
.dw__table { width: 100%; border-collapse: collapse; font-size: 13px; }
.dw__table th { padding: 6px 8px; text-align: left; font-weight: 400; color: var(--theme-elevation-500); border-bottom: 1px solid var(--theme-elevation-150); white-space: nowrap; }
.dw__table td { padding: 8px; border-bottom: 1px solid var(--theme-elevation-100); vertical-align: middle; }
.dw__table tr:last-child td { border-bottom: 0; }
.dw__table th:first-child, .dw__table td:first-child { padding-left: 0; }
.dw__table th:last-child, .dw__table td:last-child { padding-right: 0; }
.dw__num { text-align: right !important; font-variant-numeric: tabular-nums; }
.dw__muted { color: var(--theme-elevation-500); }
.dw__nowrap { white-space: nowrap; }
.dw__scroll { overflow-x: auto; }
`;

export const STYLE_HREF = "dev-dashboard-widgets";
