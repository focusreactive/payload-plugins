import { cva } from "class-variance-authority";

export const statusVar = cva("", {
  variants: {
    status: {
      good: "[--seo-c:var(--seo-good)]",
      warn: "[--seo-c:var(--seo-warn)]",
      bad: "[--seo-c:var(--seo-bad)]",
      idle: "[--seo-c:var(--theme-elevation-300)]",
    },
  },
});
