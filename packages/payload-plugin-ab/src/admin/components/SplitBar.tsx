export interface SplitSegment {
  id: string;
  label: string;
  value: number;
}

export function SplitBar({ segments }: { segments: SplitSegment[] }) {
  const description = segments.map((s) => `${s.label} ${s.value}%`).join(", ");

  return (
    <div className="ab-split" role="img" aria-label={`Traffic split: ${description}`}>
      {segments.map((segment, index) => (
        <span
          key={segment.id}
          className="ab-split__segment"
          data-series={index}
          style={{ flexGrow: segment.value }}
          title={`${segment.label} · ${segment.value}%`}
        />
      ))}
    </div>
  );
}
