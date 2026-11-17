import type { GaugeModel } from "../../../engine/types/visualization";
import { cn } from "../../../utils/style";
import { statusVar } from "../variants";

export function MiniGauge({ gauge }: { gauge: GaugeModel }) {
  return (
    <span className="relative block w-[88px] h-[14px] flex-none" aria-hidden="true">
      <span className="absolute inset-x-0 top-[5px] h-[4px] rounded-full overflow-hidden flex bg-neutral-100">
        {gauge.bands.map((band) => (
          <span
            key={`${band.startPct}-${band.endPct}`}
            className={cn("h-full", band.status === "good" ? "bg-seo-good-200" : "bg-transparent")}
            style={{ width: `${band.endPct - band.startPct}%` }}
          />
        ))}
      </span>
      <span
        className={cn(
          "absolute top-[2px] w-[10px] h-[10px] -ml-[5px] rounded-full border-2 border-neutral-0 bg-(--seo-c) shadow-[0_0_0_1px_var(--seo-c)]",
          statusVar({ status: gauge.markerStatus })
        )}
        style={{ left: `${gauge.markerPct}%` }}
      />
    </span>
  );
}
