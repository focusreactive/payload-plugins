import { Pill, SectionHeader } from "@/components/wb/primitives";

import type { WbFeaturedItem, WbFeaturedProps } from "./types";

function FeaturedCard({ item }: { item: WbFeaturedItem }) {
  return (
    <a
      href={item.href ?? "#"}
      className="relative flex min-h-[480px] flex-col justify-end overflow-hidden rounded-sm bg-[linear-gradient(155deg,#456a80,#2a4250)] no-underline"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.image} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0F0C0800] via-[#0F0C0880] to-[#0F0C08CC]" />
      <div className="relative p-8 text-white">
        <div className="mb-3 flex items-center gap-2.5">
          <Pill variant="onImage" className="px-3 py-1 text-[11.5px] font-normal">
            {item.category}
          </Pill>
          <span className="text-[12px] text-white/[0.68]">{item.brand}</span>
        </div>
        <h3 className="m-0 mb-2.5 font-display text-[20px] font-semibold leading-[1.25]">
          {item.title}
        </h3>
        <p className="m-0 mb-3 text-[13.5px] leading-[1.5] text-white/[0.74]">{item.description}</p>
        <span className="text-[12px] text-white/55">{item.date}</span>
      </div>
    </a>
  );
}

export function WbFeatured({ eyebrow, title, cta, ctaHref = "#", items }: WbFeaturedProps) {
  return (
    <section className="mt-24 bg-teal-700 py-20">
      <div className="mx-auto max-w-containerMaxW px-containerBase">
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          cta={cta}
          ctaHref={ctaHref}
          onDark
          className="mb-9"
        />
        <div className="grid grid-cols-1 gap-[22px] md:grid-cols-3">
          {items.map((item) => (
            <FeaturedCard key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
