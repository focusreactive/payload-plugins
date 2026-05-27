import { cn } from "../../../utils";
import { RichText } from "../../ui/richText";
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
          <div
            className={cn(
              "prose prose-lg max-w-none text-foreground/85",
              "prose-headings:font-display prose-headings:tracking-tight prose-headings:text-foreground prose-headings:text-balance",
              "prose-h1:text-5xl prose-h1:leading-[1.05] sm:prose-h1:text-6xl",
              "prose-h2:text-4xl prose-h2:leading-[1.05] sm:prose-h2:text-5xl",
              "prose-h3:text-2xl prose-h3:font-display sm:prose-h3:text-3xl",
              "prose-strong:text-foreground prose-strong:font-semibold",
              "prose-em:font-display prose-em:not-italic prose-em:italic prose-em:text-primary",
              "prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:text-orange-700",
              "prose-blockquote:border-l-2 prose-blockquote:border-primary prose-blockquote:not-italic prose-blockquote:text-foreground/70 prose-blockquote:font-display prose-blockquote:italic prose-blockquote:text-2xl",
              "prose-code:bg-muted prose-code:text-foreground prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.85em] prose-code:before:content-[''] prose-code:after:content-['']",
              "prose-p:leading-relaxed",
              "prose-ul:list-none prose-ul:pl-0 [&_ul>li]:relative [&_ul>li]:pl-6 [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:top-3 [&_ul>li]:before:size-1.5 [&_ul>li]:before:rounded-pill [&_ul>li]:before:bg-primary",
              "prose-hr:border-border"
            )}
          >
            <RichText {...text} />
          </div>
        </div>
      ))}
    </div>
  );
}
