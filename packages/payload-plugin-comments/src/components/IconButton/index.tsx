import { cva } from "class-variance-authority";

import { cn } from "../../utils/general/cn";

const variants = cva(
  "flex justify-center items-center p-0 rounded border-none transition-colors cursor-pointer",
  {
    compoundVariants: [
      {
        variant: "neutral",
        isActive: true,
        class: "text-(--theme-text)",
      },
      {
        variant: "neutralSecondary",
        isActive: true,
        class: "text-(--theme-text)",
      },
      {
        variant: "primary",
        isActive: true,
        class: "bg-(--theme-elevation-800)",
      },
    ],
    defaultVariants: {
      isActive: false,
      size: "md",
      variant: "neutral",
    },
    variants: {
      isActive: {
        false: "",
        true: "",
      },
      size: {
        md: "w-[24px] h-[24px]",
        sm: "w-[20px] h-[20px]",
      },
      variant: {
        neutral:
          "bg-transparent hover:bg-(--theme-elevation-50) text-(--theme-elevation-450) hover:text-(--theme-text)",
        neutralSecondary:
          "bg-(--theme-elevation-100) hover:bg-(--theme-elevation-150) text-(--theme-elevation-600) hover:text-(--theme-text)",
        primary:
          "bg-(--theme-elevation-1000) hover:bg-(--theme-elevation-800) text-(--theme-elevation-0)",
      },
    },
  }
);

interface Props extends React.HTMLAttributes<HTMLButtonElement> {
  className?: string;
  title?: string;
  children: React.ReactNode;
  variant?: "neutral" | "neutralSecondary" | "primary";
  size?: "sm" | "md";
  isActive?: boolean;
  tabIndex?: number;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function IconButton({
  className,
  title,
  children,
  variant,
  size,
  isActive,
  tabIndex,
  onClick,
  ...nativeButtonProps
}: Props) {
  return (
    <button
      className={cn(variants({ isActive, size, variant }), className)}
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      tabIndex={tabIndex}
      {...nativeButtonProps}
    >
      {children}
    </button>
  );
}
