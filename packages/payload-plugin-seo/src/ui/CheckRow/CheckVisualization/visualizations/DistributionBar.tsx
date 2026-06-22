"use client";

import type { DistributionModel } from "../../../../engine/types/visualization";

export function DistributionBar({ positions }: DistributionModel) {
  return (
    <>
      <div className="seo-docbar relative h-[24px] rounded-rs border border-neutral-200">
        {positions.map((p, i) => (
          <i
            key={`${p}-${i}`}
            className="absolute top-[3px] bottom-[3px] w-[3px] rounded-[2px] bg-neutral-800"
            style={{ left: `${p}%` }}
          />
        ))}
      </div>

      <div className="flex justify-between text-[10px] text-neutral-500 mt-[5px]">
        <span>start</span>
        <span>middle</span>
        <span>end</span>
      </div>
    </>
  );
}
