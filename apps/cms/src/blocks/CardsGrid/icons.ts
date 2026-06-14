export const CARD_ICONS = [
  "map",
  "clock",
  "zap",
  "activity",
  "layout-grid",
  "sparkles",
  "file-text",
  "users",
  "bar-chart-3",
  "plug",
  "shield",
  "git-branch",
  "gauge",
  "bell",
  "layers",
  "workflow",
  "calendar",
  "compass",
  "target",
  "wand-2",
] as const;

export type CardIcon = (typeof CARD_ICONS)[number];
