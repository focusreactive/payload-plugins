import { cn } from "@/components/utils";
import { Eyebrow } from "@/components/Eyebrow";
import LogoItem from "./LogoItem";
import { AlignVariant } from "./types";
import type { ILogosProps } from "./types";

export function Logos({ items, alignVariant, label }: ILogosProps) {
  const align = alignVariant ?? AlignVariant.Center;

  // §6.7: text wordmarks in a 2–6 column grid with hairline dividers (no third-party logo files).
  if (items.every((item) => !item.image)) {
    return (
      <div className="flex flex-col gap-8">
        {label ? <h2 className="text-h-section text-heading">{label}</h2> : null}
        <ul className="grid grid-cols-2 border-l border-t border-border sm:grid-cols-3 lg:grid-cols-6">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex min-h-24 items-center justify-center border-b border-r border-border px-4 py-6 text-center"
            >
              <LogoItem {...item} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-7">
      {label ? (
        <Eyebrow tone="muted" prefix="none">
          {label}
        </Eyebrow>
      ) : null}

      <div
        className={cn(
          "flex flex-wrap items-center gap-x-[clamp(28px,5vw,64px)] gap-y-6 sm:gap-y-8",
          {
            "justify-center": align === AlignVariant.Center,
            "justify-end": align === AlignVariant.Right,
            "justify-start": align === AlignVariant.Left,
          }
        )}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className={cn(
              "h-6 opacity-60 grayscale transition-[opacity,filter]",
              "motion-safe:duration-200 motion-safe:[transition-timing-function:var(--ease-out)]",
              "hover:opacity-100",
              "sm:h-7.5"
            )}
          >
            <LogoItem {...item} />
          </div>
        ))}
      </div>
    </div>
  );
}
