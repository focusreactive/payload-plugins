"use client";

import type { HeadingLevelCount } from "../../../../engine/types/analysis";
import { cn } from "../../../../utils/style";

interface HeadingLevelTilesProps {
  levels: HeadingLevelCount[];
}

export function HeadingLevelTiles({ levels }: HeadingLevelTilesProps) {
  return (
    <div className="grid grid-cols-6 gap-[6px] px-[15px] pt-[8px] pb-[12px]">
      {levels.map(({ level, count }) => {
        const zero = count === 0;

        return (
          <div
            key={level}
            className={cn(
              "flex items-baseline justify-center gap-[5px] rounded-rs border px-[2px] py-[7px]",
              zero ? "border-dashed border-neutral-300 bg-neutral-50" : "border-neutral-200 bg-neutral-0"
            )}
          >
            <span className={cn("font-mono text-[12px] font-semibold", zero ? "text-neutral-400" : "text-neutral-500")}>H{level}</span>
            <span className={cn("font-mono text-[12px] font-bold", zero ? "text-neutral-300" : "text-neutral-1000")}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}
