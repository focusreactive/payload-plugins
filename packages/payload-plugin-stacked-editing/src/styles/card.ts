export const CARD_CSS = `
.stacked-editing-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  max-width: 100%;
  pointer-events: none;
}
.stacked-editing-card__number {
  flex: none;
  min-width: 18px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--theme-elevation-400);
}
.stacked-editing-card__thumb {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  overflow: hidden;
  border-radius: var(--style-radius-s, 3px);
  background: var(--theme-elevation-100);
  color: var(--theme-elevation-500);
  box-shadow: inset 0 0 0 1px var(--theme-elevation-150);
}
.stacked-editing-card__thumb--loading {
  background: linear-gradient(90deg, var(--theme-elevation-100), var(--theme-elevation-150), var(--theme-elevation-100));
  background-size: 200% 100%;
  animation: stacked-editing-shimmer 1.2s linear infinite;
}
@keyframes stacked-editing-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}
.stacked-editing-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.stacked-editing-card__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 18px;
}
.stacked-editing-card__title,
.stacked-editing-card__subtitle {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stacked-editing-card__title {
  font-weight: 500;
  color: var(--theme-text);
}
.stacked-editing-card__title--empty {
  color: var(--theme-elevation-500);
  font-weight: 400;
}
.stacked-editing-card__subtitle {
  font-size: 12px;
  color: var(--theme-elevation-500);
}
@media (prefers-reduced-motion: reduce) {
  .stacked-editing-card__thumb--loading {
    animation: none;
  }
}
`;
