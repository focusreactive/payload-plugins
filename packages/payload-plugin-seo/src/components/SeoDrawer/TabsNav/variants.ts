import { cva } from "class-variance-authority";

export const tabVariants = cva(
  "inline-flex items-center gap-[6px] py-[11px] bg-transparent whitespace-nowrap text-[12.5px] cursor-pointer",
  {
    variants: {
      active: {
        true: "text-neutral-1000 font-medium",
        false: "text-neutral-500 hover:text-neutral-800",
      },
    },
    defaultVariants: { active: false },
  }
);
