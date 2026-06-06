"use client";

export function DistributionBar({ positions }: { positions: number[] }) {
  return (
    <>
      <div className="docbar">
        {positions.map((p, i) => (
          <i key={`${p}-${i}`} style={{ left: `${p}%` }} />
        ))}
      </div>

      <div className="scale seo-muted" style={{ marginTop: 5 }}>
        <span>start</span>
        <span>middle</span>
        <span>end</span>
      </div>
    </>
  );
}
