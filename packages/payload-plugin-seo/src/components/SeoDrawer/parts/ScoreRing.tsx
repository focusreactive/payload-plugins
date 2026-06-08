"use client";

import type { Status } from "../../../engine/types";
import { cn } from "../../../utils/style";
import { statusVar } from "../variants";

interface ScoreRingProps {
  score: number;
  status: Status;
}

export function ScoreRing({ score, status }: ScoreRingProps) {
  return (
    <div
      className={cn("w-[60px] h-[60px] rounded-full flex-none grid place-items-center", statusVar({ status }))}
      style={{
        background: `conic-gradient(var(--seo-c) ${score}%, var(--theme-elevation-150) 0)`,
      }}
    >
      <div className="w-[48px] h-[48px] rounded-full bg-neutral-0 grid place-items-center font-bold text-[18px]" style={{ color: "var(--seo-c)" }}>
        {score}
      </div>
    </div>
  );
}
