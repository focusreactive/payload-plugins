import { cn } from "@/components/utils";
import { RichText } from "@/components/richText";
import type { ICopyProps } from "./types";

export function Copy({ columns, isReversedOnMobile }: ICopyProps) {
  const isTwoColumn = columns.length === 2;

  return (
    <div
      className={cn("flex flex-col items-start gap-10 lg:gap-16", isTwoColumn && "lg:flex-row", {
        "flex-col-reverse": isReversedOnMobile,
      })}
    >
      {columns.map((text, index) => (
        <div
          key={index}
          className={cn("w-full", {
            "lg:basis-1/2": isTwoColumn,
            "mx-auto max-w-3xl": !isTwoColumn,
          })}
        >
          <RichText {...text} variant="copy" />
        </div>
      ))}
    </div>
  );
}
