import { cva, type VariantProps } from "class-variance-authority";

export const indBoxVariants = cva(
  "flex min-w-[200px] flex-1 basis-0 items-center gap-[11px] rounded-(--style-radius-m) border border-(--theme-border-color) bg-(--theme-elevation-0) px-3.5 py-[11px] [&>svg]:shrink-0",
  {
    variants: {
      tone: {
        ok: "border-(--theme-success-200) bg-(--theme-success-50) [&>svg]:text-(--theme-success-700) dark:[&>svg]:text-(--theme-success-500)",
        fail: "border-(--theme-error-500) bg-(--theme-error-50) [&>svg]:text-(--theme-error-500)",
        warn: "border-(--theme-warning-200) bg-(--theme-warning-50) [&>svg]:text-(--theme-warning-700)",
        neutral: "[&>svg]:text-(--theme-elevation-500)",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export const indPillVariants = cva(
  "inline-flex items-center rounded-full border px-[7px] py-px text-[10px] font-semibold tracking-[0.01em]",
  {
    variants: {
      tone: {
        ok: "border-(--theme-success-200) bg-(--theme-success-100) text-(--theme-success-700) dark:text-(--theme-success-500)",
        fail: "border-(--theme-error-500) bg-[var(--theme-error-100,var(--theme-error-50))] text-(--theme-error-500)",
        warn: "border-(--theme-warning-200) bg-(--theme-warning-100) text-(--theme-warning-700)",
        neutral:
          "border-transparent bg-(--theme-elevation-100) text-[var(--theme-elevation-600,var(--theme-elevation-500))]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type IndTone = NonNullable<VariantProps<typeof indBoxVariants>["tone"]>;

export const verdictBadgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-[3px] text-[11px] font-medium",
  {
    variants: {
      verdict: {
        winner:
          "border border-(--theme-success-100) bg-(--theme-success-50) text-(--theme-success-700) dark:text-(--theme-success-500)",
        loser: "border border-(--theme-error-500) bg-(--theme-error-50) text-(--theme-error-500)",
        ns: "bg-(--theme-elevation-100) text-[var(--theme-elevation-600,var(--theme-elevation-500))]",
      },
    },
  },
);

export type VerdictTone = NonNullable<VariantProps<typeof verdictBadgeVariants>["verdict"]>;

export const PANEL_TBL =
  "w-full border-collapse text-[12.5px] [&_th]:px-2 [&_th]:py-1.5 [&_td]:border-b [&_td]:border-(--theme-elevation-100) [&_td]:px-2 [&_td]:py-[9px] [&_thead_th]:border-b [&_thead_th]:border-(--theme-border-color) [&_thead_th]:text-left [&_thead_th]:font-semibold [&_thead_th]:text-(--theme-elevation-500) [&_.num]:text-right [&_.num]:tabular-nums";
