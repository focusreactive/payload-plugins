import { cva } from "class-variance-authority";

import { cn } from "@/core/lib/utils";

import type { ISectionData } from "../SectionContainer/types";

const containerVariants = cva("mx-auto w-full", {
  defaultVariants: {
    maxWidth: "base",
    paddingX: "base",
  },
  variants: {
    maxWidth: {
      base: "max-w-containerMaxW",
      none: "max-w-none",
    },

    paddingX: {
      base: "px-containerBase",
      none: "px-0",
    },
  },
});

interface ContainerProps {
  children: React.ReactNode;
  containerData: Pick<ISectionData, "paddingX" | "maxWidth">;
  className?: string;
}

export function Container({
  children,
  containerData,
  className,
}: ContainerProps) {
  const { paddingX, maxWidth } = containerData;
  return (
    <div
      className={cn(
        containerVariants({
          maxWidth,
          paddingX,
        }),
        className
      )}
    >
      {children}
    </div>
  );
}
