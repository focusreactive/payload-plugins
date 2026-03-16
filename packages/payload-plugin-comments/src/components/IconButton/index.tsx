import { cva } from "class-variance-authority";
import { cn } from "../../utils/general/cn";

const variants = cva("flex justify-center items-center p-0 rounded border-none transition-colors cursor-pointer", {
  variants: {
    variant: {
      neutral: "bg-transparent hover:bg-(--theme-elevation-50) text-(--theme-elevation-450) hover:text-(--theme-text)",
      neutralSecondary:
        "bg-(--theme-elevation-100) hover:bg-(--theme-elevation-150) text-(--theme-elevation-600) hover:text-(--theme-text)",
      primary: "bg-(--theme-elevation-1000) hover:bg-(--theme-elevation-800) text-(--theme-elevation-0)",
    },
    size: {
      sm: "w-[20px] h-[20px]",
      md: "w-[24px] h-[24px]",
    },
  },
  defaultVariants: {
    variant: "neutral",
    size: "md",
  },
});

interface Props {
  className?: string;
  title?: string;
  children: React.ReactNode;
  variant?: "neutral" | "neutralSecondary" | "primary";
  size?: "sm" | "md";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  tabIndex?: number;
}

export function IconButton({ className, title, children, variant, size, onClick, tabIndex }: Props) {
  return (
    <button
      className={cn(variants({ variant, size }), className)}
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      tabIndex={tabIndex}>
      {children}
    </button>
  );
}
