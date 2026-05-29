import { cva, type VariantProps } from "class-variance-authority";

export const outcomeBadgeVariants = cva(
  "inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border py-[3px] pl-2 pr-[9px] text-[11px] font-medium",
  {
    variants: {
      tone: {
        live: "border-(--theme-success-100) bg-(--theme-success-50) text-(--theme-success-700)",
        success: "border-(--theme-success-200) bg-(--theme-success-50) text-(--theme-success-700)",
        warning: "border-(--theme-warning-200) bg-(--theme-warning-50) text-(--theme-warning-700)",
        error: "border-(--theme-error-500) bg-(--theme-error-50) text-(--theme-error-500)",
        neutral: "border-(--theme-border-color) bg-(--theme-elevation-50) text-(--theme-elevation-700)",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type OutcomeBadgeTone = NonNullable<VariantProps<typeof outcomeBadgeVariants>["tone"]>;

export const experimentRowVariants = cva("", {
  variants: {
    srmFailed: {
      true: "shadow-[inset_3px_0_0_var(--theme-error-500)] [&>td:first-child]:!pl-[13px]",
      false: "",
    },
  },
  defaultVariants: { srmFailed: false },
});
