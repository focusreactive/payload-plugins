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
          <div
            className={cn(
              "prose max-w-none",
              "prose-p:text-[1.18rem] prose-p:leading-[1.75] prose-p:text-foreground/88",
              "prose-headings:font-display prose-headings:tracking-tight prose-headings:text-foreground prose-headings:text-balance",
              "prose-h1:text-5xl prose-h1:leading-[1.05] sm:prose-h1:text-6xl",
              "prose-h2:text-[clamp(1.7rem,3vw,2.2rem)] prose-h2:leading-[1.1] prose-h2:mt-[1.8em]",
              "prose-h3:text-[1.4rem] prose-h3:font-display prose-h3:leading-[1.15] prose-h3:mt-[1.6em]",
              "prose-strong:text-foreground prose-strong:font-semibold",
              "prose-em:font-display prose-em:italic prose-em:text-primary",
              "prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:text-primary-hover",
              "prose-blockquote:border-l-[3px] prose-blockquote:border-primary prose-blockquote:not-italic prose-blockquote:font-display prose-blockquote:italic prose-blockquote:text-[1.5rem] prose-blockquote:leading-[1.3] prose-blockquote:pl-7 prose-blockquote:py-1 prose-blockquote:text-foreground/80",
              "prose-code:bg-muted prose-code:text-foreground prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.85em] prose-code:before:content-[''] prose-code:after:content-['']",
              "prose-ul:list-none prose-ul:pl-0",
              "[&_ul>li]:relative [&_ul>li]:pl-8 [&_ul>li]:text-foreground/88 [&_ul>li]:text-[1.12rem] [&_ul>li]:leading-[1.7]",
              "[&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:top-[6px] [&_ul>li]:before:size-5 [&_ul>li]:before:rounded-pill [&_ul>li]:before:bg-primary-soft",
              "[&_ul>li]:after:absolute [&_ul>li]:after:left-[6px] [&_ul>li]:after:top-[10px] [&_ul>li]:after:h-[9px] [&_ul>li]:after:w-[5px] [&_ul>li]:after:rotate-45 [&_ul>li]:after:border-b-2 [&_ul>li]:after:border-r-2 [&_ul>li]:after:border-primary",
              "[&_figcaption]:font-mono [&_figcaption]:text-[0.75rem] [&_figcaption]:uppercase [&_figcaption]:tracking-[0.06em] [&_figcaption]:text-center [&_figcaption]:text-muted-foreground [&_figcaption]:mt-3",
              "[&_figure]:my-8",
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
