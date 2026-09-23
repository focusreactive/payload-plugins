"use client";

export const BackgroundStripes = () => {
  return (
    <div className="absolute top-0 h-108 w-full overflow-hidden pt-[152px] md:pt-[94px] 2xl:h-128 2xl:pt-[136px]">
      <div className="-skew-y-[7deg] [--column-width:minmax(0,calc(1280px/var(--content-columns)))] [--content-columns:12] [--gutter-columns:4] [--stripe-height:34px] sm:[--stripe-height:48px] lg:[--stripe-height:72px]">
        {/* BG MASK */}
        <div className="absolute bottom-[var(--stripe-height)] h-110 w-full bg-utility-brand-50_alt"></div>
        {/* STRIPES */}
        <div
          className="relative grid h-full"
          style={{
            gridTemplateRows: "repeat(3,var(--stripe-height))",
            gridTemplateColumns:
              "[viewport-start] 1fr [left-gutter-start] repeat(var(--gutter-columns),var(--column-width)) [left-gutter-end content-start] repeat(var(--content-columns),var(--column-width)) [content-end right-gutter-start] repeat(var(--gutter-columns),var(--column-width)) [right-gutter-end] 1fr [viewport-end]",
          }}
        >
          <div
            style={{ gridArea: "2 / left-gutter-start / auto / span 5" }}
            className="bg-utility-brand-100_alt"
          ></div>
          <div
            style={{ gridArea: "3 / viewport-start / auto / span 4" }}
            className="bg-utility-brand-400_alt"
          ></div>
          <div
            style={{ gridArea: "1 / span 7 / auto / viewport-end" }}
            className="bg-utility-brand-400_alt"
          ></div>
          <div
            style={{ gridArea: "2 / span 8 / auto / right-gutter-end" }}
            className="bg-utility-brand-200_alt"
          ></div>
          <div
            style={{ gridArea: "3 / span 3 / auto / viewport-end" }}
            className="bg-utility-brand-100_alt"
          ></div>
        </div>
      </div>
    </div>
  );
};
