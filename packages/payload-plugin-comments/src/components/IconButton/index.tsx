import { cva } from "class-variance-authority";
import { cn } from "../../utils/general/cn";

const variants = cva(
  "flex justify-center items-center p-0 w-[24px] h-[24px] rounded border-none transition-colors cursor-pointer",
  {
    variants: {
      variant: {
        neutral: "bg-transparent hover:bg-(--theme-elevation-50) text-(--theme-elevation-450)",
        neutralSecondary: "bg-(--theme-elevation-100) hover:bg-(--theme-elevation-150) text-(--theme-elevation-600)",
        primary: "bg-(--theme-elevation-1000) hover:bg-(--theme-elevation-800) text-(--theme-elevation-0)",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

interface Props {
  className?: string;
  title?: string;
  children: React.ReactNode;
  variant?: "neutral" | "neutralSecondary" | "primary";
  onClick: () => void;
}

export function IconButton({ className, title, children, variant, onClick }: Props) {
  return (
    <button
      className={cn(variants({ variant }), className)}
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}>
      {children}
    </button>
  );
}
