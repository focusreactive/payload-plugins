"use client";

export interface Band {
  width: number;
  color: string;
}

interface DensityGaugeProps {
  bands: Band[];
  markerPct: number;
  markerLabel: string;
  markerColor: string;
  scale: [string, string, string];
}

export function DensityGauge({ bands, markerPct, markerLabel, markerColor, scale }: DensityGaugeProps) {
  return (
    <>
      <div className="track2">
        {bands.map((b, i) => (
          <i key={`${b.color}-${i}`} style={{ width: `${b.width}%`, background: b.color }} />
        ))}
        <div className="mk2" style={{ left: `${markerPct}%` }}>
          <span className="lbl" style={{ color: markerColor }}>
            {markerLabel}
          </span>
          <span className="dot2" style={{ borderColor: markerColor }} />
        </div>
      </div>
      <div className="scale seo-muted">
        <span>{scale[0]}</span>
        <span style={{ color: "var(--seo-good)" }}>{scale[1]}</span>
        <span>{scale[2]}</span>
      </div>
    </>
  );
}
