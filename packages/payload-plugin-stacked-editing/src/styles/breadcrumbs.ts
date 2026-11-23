import { BASE } from "./base.js";

export const BREADCRUMBS_CSS = `
.${BASE}__breadcrumbs {
  position: relative;
  min-width: 0;
}
.${BASE}__crumbs {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 2px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
  font-size: 13px;
  line-height: 22px;
  height: 22px;
  white-space: nowrap;
  color: var(--theme-elevation-500);
}
.${BASE}__crumbs--measure {
  position: absolute;
  top: 0;
  left: 0;
  width: max-content;
  overflow: visible;
  visibility: hidden;
  pointer-events: none;
}
.${BASE}__crumb {
  display: inline-flex;
  flex: none;
  align-items: center;
  min-width: 0;
}
.${BASE}__crumb--is-current {
  flex: 0 1 auto;
}
.${BASE}__crumb + .${BASE}__crumb::before {
  content: "/";
  padding: 0 4px;
  color: var(--theme-elevation-250);
}
.${BASE}__crumb-button {
  display: inline-block;
  max-width: 24ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 0;
  border-radius: var(--style-radius-s, 3px);
  background: none;
  padding: 0 4px;
  margin: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.${BASE}__crumb-button:hover,
.${BASE}__crumb-button:focus-visible,
.${BASE}__crumb-more[aria-expanded="true"] {
  color: var(--theme-text);
  background: var(--theme-elevation-100);
  outline: none;
}
.${BASE}__crumb--field .${BASE}__crumb-button {
  color: var(--theme-elevation-400);
}
.${BASE}__crumb-more {
  min-width: 24px;
  background: var(--theme-elevation-50);
  text-align: center;
  letter-spacing: 1px;
}
.${BASE}__crumb-current {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
  color: var(--theme-text);
  font-weight: 600;
}
@keyframes stacked-editing-menu-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.${BASE}__menu {
  position: absolute;
  z-index: 10;
  top: calc(100% + 6px);
  display: flex;
  flex-direction: column;
  min-width: 220px;
  max-width: 360px;
  padding: 4px 0;
  border: 1px solid var(--theme-elevation-150);
  border-radius: var(--style-radius-m, 4px);
  background: var(--theme-input-bg, var(--theme-elevation-0));
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08);
  animation: stacked-editing-menu-in 140ms ease-out both;
}
.${BASE}__menu-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  border: 0;
  background: none;
  padding: 6px 12px;
  margin: 0;
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  text-align: left;
  color: var(--theme-text);
  cursor: pointer;
}
.${BASE}__menu-item:hover,
.${BASE}__menu-item:focus-visible {
  background: var(--theme-elevation-100);
  outline: none;
}
.${BASE}__menu-item--field .${BASE}__menu-label {
  color: var(--theme-elevation-500);
}
.${BASE}__menu-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.${BASE}__menu-hint {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--theme-elevation-400);
}
@media (prefers-reduced-motion: reduce) {
  .${BASE}__menu {
    animation: none;
  }
}
`;
