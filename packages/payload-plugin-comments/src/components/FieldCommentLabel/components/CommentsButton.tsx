import { cn } from "../../../utils/general/cn";
import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export function CommentsButton({ className, children, ...restProps }: Props) {
  return (
    <button
      className={cn(
        `flex items-center justify-center rounded border-none cursor-pointer p-1.5
          bg-transparent text-(--color-base-400) hover:bg-(--color-base-50)
          transition-colors duration-150`,
        className,
      )}
      type="button"
      {...restProps}>
      {children}
    </button>
  );
}
