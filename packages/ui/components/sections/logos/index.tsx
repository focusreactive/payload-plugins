import { cn } from "../../../utils";
import LogoItem from "./LogoItem";
import { AlignVariant } from './types';
import type { ILogosProps } from './types';

export function Logos({ items, alignVariant }: ILogosProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center justify-center gap-6", {
        "justify-center": alignVariant === AlignVariant.Center,
        "justify-end": alignVariant === AlignVariant.Right,
        "justify-start": alignVariant === AlignVariant.Left,
      })}
    >
      {items.map((item, i) => (
        <div className="h-20" key={i}>
          <LogoItem {...item} />
        </div>
      ))}
    </div>
  );
}
