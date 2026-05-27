import { cn } from "../../../utils";
import { Eyebrow } from "../../ui/Eyebrow";
import LogoItem from "./LogoItem";
import { AlignVariant } from "./types";
import type { ILogosProps } from "./types";

export function Logos({ items, alignVariant }: ILogosProps) {
  const align = alignVariant ?? AlignVariant.Center;

  return (
    <div className="flex flex-col items-center gap-10 sm:gap-12">
      <Eyebrow tone="muted" prefix="none">
        Trusted by
      </Eyebrow>

      <p className="max-w-2xl text-center font-display text-2xl italic leading-snug text-foreground/85 sm:text-3xl">Built with — and for — teams running real traffic.</p>

      <div
        className={cn("flex w-full max-w-5xl flex-wrap items-center gap-x-10 gap-y-8 sm:gap-x-14 lg:gap-x-20", {
          "justify-center": align === AlignVariant.Center,
          "justify-end": align === AlignVariant.Right,
          "justify-start": align === AlignVariant.Left,
        })}
      >
        {items.map((item, i) => (
          <div key={i} className="h-10 opacity-70 grayscale transition-all duration-200 hover:opacity-100 hover:grayscale-0 sm:h-12">
            <LogoItem {...item} />
          </div>
        ))}
      </div>
    </div>
  );
}
