"use client";

interface SegmentBarProps {
  countLabel?: string;
  filledPct: number;
  filledColor: string;
  legend?: { color: string; label: string }[];
}

export function SegmentBar({ countLabel, filledPct, filledColor, legend }: SegmentBarProps) {
  return (
    <>
      {countLabel && (
        <div className="countlbl">
          <span>{countLabel}</span>
        </div>
      )}

      <div className="seg2">
        <i style={{ width: `${filledPct}%`, background: filledColor }} />
        <i
          style={{
            width: `${100 - filledPct}%`,
            background: "var(--seo-e150)",
          }}
        />
      </div>

      {legend && (
        <div className="legend">
          {legend.map((l) => (
            <span key={l.label}>
              <span className="sw" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
