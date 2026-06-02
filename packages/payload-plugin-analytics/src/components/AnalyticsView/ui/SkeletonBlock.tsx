export interface SkeletonBlockProps {
  shape: "kpi" | "table" | "chart";
  rows?: number;
}

export function SkeletonBlock({ shape, rows = 5 }: SkeletonBlockProps) {
  if (shape === "kpi") {
    return (
      <div className="flex flex-col gap-2.5">
        <div className="pa-animate-shimmer h-3 w-3/5 rounded" />
        <div className="pa-animate-shimmer h-6 w-4/5 rounded" />
        <div className="pa-animate-shimmer h-2.5 w-2/5 rounded" />
      </div>
    );
  }

  if (shape === "chart") {
    return (
      <div className="flex flex-col gap-2">
        <div className="pa-animate-shimmer h-3 w-1/4 rounded" />
        <div className="pa-animate-shimmer h-[200px] w-full rounded" />
        <div className="pa-animate-shimmer h-2.5 w-1/3 rounded" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="pa-animate-shimmer h-3 w-1/4 rounded" />

      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="pa-animate-shimmer h-3 flex-1 rounded" />
          <div className="pa-animate-shimmer h-3 w-12 rounded" />
        </div>
      ))}
    </div>
  );
}
