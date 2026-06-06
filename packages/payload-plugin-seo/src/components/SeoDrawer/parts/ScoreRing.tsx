"use client";

import type { Status } from "../../../engine/types";

const COLOR: Record<Status, string> = {
  good: "var(--seo-good)",
  warn: "var(--seo-warn)",
  bad: "var(--seo-bad)",
};

interface ScoreRingProps {
  score: number;
  status: Status;
}

export function ScoreRing({ score, status }: ScoreRingProps) {
  return (
    <div
      className="ring"
      style={{
        background: `conic-gradient(${COLOR[status]} ${score}%, var(--seo-e150) 0)`,
      }}
    >
      <div className="in" style={{ color: COLOR[status] }}>
        {score}
      </div>
    </div>
  );
}
