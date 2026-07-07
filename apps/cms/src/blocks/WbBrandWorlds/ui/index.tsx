import { Eyebrow, Pill } from "@/components/wb/primitives";

import type { WbBrandWorldItem, WbBrandWorldsProps } from "./types";

function BrandCard({ item }: { item: WbBrandWorldItem }) {
  return (
    <a
      href={item.href ?? "#"}
      className="group flex min-h-[420px] flex-col border-b border-border bg-white px-[32px] pt-[34px] pb-[32px] no-underline transition-colors hover:bg-wash md:border-r md:border-b-0"
    >
      <div className="mb-[32px] flex items-start justify-between">
        <span className="font-display text-[40px] font-semibold tracking-[-0.03em] text-border">
          {item.number}
        </span>
      </div>
      <h3 className="m-0 mb-[16px] font-display text-[24px] font-semibold tracking-[-0.015em] text-foreground">
        {item.brand}
      </h3>
      <p className="m-0 mb-[24px] text-[14.5px] leading-[1.55] text-muted-foreground">
        {item.description}
      </p>
      <div className="mb-[32px] flex flex-wrap gap-2">
        {item.includes.map((include) => (
          <Pill key={include} variant="soft" className="px-3 py-[5px] font-normal">
            {include}
          </Pill>
        ))}
      </div>
      <div className="mt-auto border-t border-border pt-[16px]">
        <div className="mb-[6px] text-[11px] uppercase tracking-[0.08em] text-faint">Latest</div>
        <div className="mb-[16px] font-display text-[14px] font-medium leading-[1.35] text-[#222]">
          {item.latestHighlight}
        </div>
        <span className="text-[14px] font-semibold text-primary transition-colors group-hover:text-secondary">
          {item.latestCta}
        </span>
      </div>
    </a>
  );
}

export function WbBrandWorlds({
  eyebrow,
  title,
  titleSecondLine,
  subtitle,
  items,
}: WbBrandWorldsProps) {
  return (
    <section className="mx-auto max-w-containerMaxW px-containerBase pt-[96px]">
      <div className="mb-[44px] max-w-[780px]">
        <Eyebrow className="mb-[18px]">{eyebrow}</Eyebrow>
        <h2 className="m-0 mb-[18px] font-display text-[40px] font-semibold leading-[1.08] tracking-[-0.025em] text-foreground">
          {title}
          {titleSecondLine ? (
            <>
              <br />
              {titleSecondLine}
            </>
          ) : null}
        </h2>
        <p className="m-0 max-w-[620px] text-[17px] leading-[1.55] text-muted-foreground">
          {subtitle}
        </p>
      </div>
      <div className="grid grid-cols-1 overflow-hidden rounded-md border border-border md:grid-cols-3">
        {items.map((item) => (
          <BrandCard key={item.brand} item={item} />
        ))}
      </div>
    </section>
  );
}
