"use client";
import { useState } from "react";
import type { SerpResult } from "../../../engine/types";
import { MeterBar } from "../parts/MeterBar";
import { TITLE_WIDTH_BUDGET_PX, META_DESCRIPTION_MAX_CHARS } from "../../../constants";
import { cn } from "../../../utils/style";

type Mode = "mobile" | "desktop";

export function SerpTab({ data }: { data: SerpResult; keyphrase: string; faviconUrl: string }) {
  const [mode, setMode] = useState<Mode>("mobile");
  const titlePct = (data.titleWidthPx / TITLE_WIDTH_BUDGET_PX) * 100;
  const descPct = (data.descriptionChars / META_DESCRIPTION_MAX_CHARS) * 100;
  const titleColor = data.titleWidthPx <= 580 ? "var(--seo-good)" : data.titleWidthPx <= 600 ? "var(--seo-warn)" : "var(--seo-bad)";
  const descColor = data.descriptionChars >= 120 && data.descriptionChars <= META_DESCRIPTION_MAX_CHARS ? "var(--seo-good)" : "var(--seo-warn)";

  return (
    <section className="panel on">
      <div className="section">
        <div className="scard-head">
          <span className="ttl" style={{ fontWeight: 600, fontSize: 12.5 }}>
            Search result preview
          </span>
          <div className="seg">
            <button type="button" className={cn("s", mode === "mobile" && "on")} onClick={() => setMode("mobile")}>
              Mobile
            </button>
            <button type="button" className={cn("s", mode === "desktop" && "on")} onClick={() => setMode("desktop")}>
              Desktop
            </button>
          </div>
        </div>
        <div className="seo-snippet"></div>
        <div className="meters">
          <MeterBar name="Title width" valueLabel={`${data.titleWidthPx} / ${TITLE_WIDTH_BUDGET_PX} px`} pct={titlePct} color={titleColor} />
          <MeterBar name="Meta description" valueLabel={`${data.descriptionChars} / ${META_DESCRIPTION_MAX_CHARS} chars`} pct={descPct} color={descColor} />
        </div>
      </div>
    </section>
  );
}
