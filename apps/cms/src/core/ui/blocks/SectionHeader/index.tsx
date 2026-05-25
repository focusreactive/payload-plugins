import type { ComponentProps } from "react";

import { cn } from "@/core/lib/utils";
import { DisplayHeading, Eyebrow } from "@repo/ui";

type Props = ComponentProps<"h2"> & {
  heading: string;
  eyebrow?: string;
  align?: "left" | "center";
  size?: "sm" | "md" | "lg";
};

export const SectionHeader: React.FC<Props> = ({ className, heading, eyebrow, align = "left", size = "lg" }) => (
  <div
    className={cn("mb-10 flex flex-col gap-4 sm:mb-14 lg:mb-16", {
      "items-center text-center": align === "center",
      "items-start": align === "left",
    })}
  >
    {eyebrow && <Eyebrow tone="primary">{eyebrow}</Eyebrow>}
    <DisplayHeading text={heading} size={size} className={className} />
  </div>
);
