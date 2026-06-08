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

export const totalPillVariants = cva("inline-flex items-center rounded-[20px] px-[11px] py-[2px] font-mono font-bold text-[12px]", {
  variants: {
    status: {
      good: "border border-seo-good bg-seo-good-100 text-seo-good",
      warn: "border border-seo-warn bg-seo-warn-100 text-seo-warn",
      bad: "border border-seo-bad bg-seo-bad-100 text-seo-bad",
    },
  },
});

export const tabVariants = cva("py-[11px] border-0 bg-transparent border-b-2 border-transparent whitespace-nowrap text-[12.5px] cursor-pointer", {
  variants: {
    active: {
      true: "text-neutral-1000 border-b-neutral-1000 font-medium",
      false: "text-neutral-500 hover:text-neutral-800",
    },
  },
  defaultVariants: { active: false },
});

export const statusPillVariants = cva("inline-flex items-center gap-[4px] px-[9px] py-[2px] rounded-[20px] text-[11px] font-semibold", {
  variants: {
    status: {
      good: "bg-seo-good-100 text-seo-good",
      warn: "bg-seo-warn-100 text-seo-warn",
      bad: "bg-seo-bad-100 text-seo-bad",
    },
  },
});
