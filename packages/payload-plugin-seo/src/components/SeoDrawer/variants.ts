import { cva } from "class-variance-authority";

export const statusVar = cva("", {
  variants: {
    status: {
      good: "[--seo-c:var(--color-seo-good)]",
      warn: "[--seo-c:var(--color-seo-warn)]",
      bad: "[--seo-c:var(--color-seo-bad)]",
    },
  },
});
