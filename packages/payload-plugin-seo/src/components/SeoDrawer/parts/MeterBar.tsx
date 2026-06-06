"use client";

interface MeterBarProps {
  name: string;
  valueLabel: string;
  pct: number;
  color: string;
}

export function MeterBar({ name, valueLabel, pct, color }: MeterBarProps) {
  return (
    <div className="meter">
      <div className="ml">
        <span className="mname">{name}</span>
        <span className="val" style={{ color }}>
          {valueLabel}
        </span>
      </div>

      <div className="mbar">
        <i style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
    </div>
  );
}
