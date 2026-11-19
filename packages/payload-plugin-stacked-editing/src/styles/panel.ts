import { BASE } from "./base.js";

export const PANEL_CSS = `
.${BASE}__header {
  display: flex;
  flex-direction: column;
  gap: calc(var(--base) * 0.4);
  margin-top: calc(var(--base) * 2);
  margin-bottom: calc(var(--base) * 1);
  padding-bottom: calc(var(--base) * 0.8);
  border-bottom: 1px solid var(--theme-elevation-100);
}
.${BASE}__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--base);
}
.${BASE}__title {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.${BASE}__kind {
  display: inline-block;
  margin-inline-end: calc(var(--base) * 0.5);
  padding: 0 calc(var(--base) * 0.4);
  border-radius: var(--style-radius-s, 3px);
  background: var(--theme-elevation-100);
  color: var(--theme-elevation-800);
  font-size: 13px;
  line-height: 22px;
  font-weight: 500;
  vertical-align: middle;
}
.${BASE}__close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--base) * 1.6);
  height: calc(var(--base) * 1.6);
  border: 0;
  border-radius: var(--style-radius-s, 3px);
  background: none;
  color: var(--theme-text);
  cursor: pointer;
  padding: 0;
}
.${BASE}__close:hover {
  background: var(--theme-elevation-100);
}
.${BASE}__close svg {
  width: calc(var(--base) * 2);
  height: calc(var(--base) * 2);
}
.${BASE}__body {
  padding-bottom: calc(var(--base) * 4);
}
.${BASE}__hint {
  margin: 0;
  font-size: 12px;
  color: var(--theme-elevation-400);
}
`;
