import { cva } from "class-variance-authority";

export const statusVar = cva("", {
  variants: {
    status: {
      good: "[--seo-c:var(--theme-success-500)]",
      warn: "[--seo-c:var(--theme-warning-500)]",
      bad: "[--seo-c:var(--theme-error-500)]",
    },
  },
});

export const totalPillVariants = cva("inline-flex items-center rounded-[20px] px-[11px] py-[2px] font-mono font-bold text-[12px]", {
  variants: {
    status: {
      good: "border border-seo-good bg-(--theme-success-100) text-seo-good",
      warn: "border border-seo-warn bg-(--theme-warning-100) text-seo-warn",
      bad: "border border-seo-bad bg-(--theme-error-100) text-seo-bad",
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
