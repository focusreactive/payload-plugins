import { cn } from "../../../utils";
import { Eyebrow } from "../../ui/Eyebrow";
import LogoItem from "./LogoItem";
import { AlignVariant } from "./types";
import type { ILogosProps } from "./types";

export function Logos({ items, alignVariant, label }: ILogosProps) {
  const align = alignVariant ?? AlignVariant.Center;

  return (
    <div className="flex flex-col items-center gap-7">
      {label ? (
        <Eyebrow tone="muted" prefix="none">
          {label}
        </Eyebrow>
      ) : null}

      <div
        className={cn("flex flex-wrap items-center gap-x-[clamp(28px,5vw,64px)] gap-y-6", {
          "justify-center": align === AlignVariant.Center,
          "justify-end": align === AlignVariant.Right,
          "justify-start": align === AlignVariant.Left,
        })}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className={cn("h-40 opacity-60 grayscale transition-[opacity,filter]", "motion-safe:duration-200 motion-safe:[transition-timing-function:var(--ease-out)]", "hover:opacity-100", "sm:h-30")}
          >
            <LogoItem {...item} />
          </div>
        ))}
      </div>
    </div>
  );
}
