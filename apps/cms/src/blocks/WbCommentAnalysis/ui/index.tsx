import { Pill, SectionHeader } from "@/components/wb/primitives";

import type {
  WbCommentAnalysisFeatured,
  WbCommentAnalysisItem,
  WbCommentAnalysisProps,
} from "./types";

function FeaturedAnalysis({ featured }: { featured: WbCommentAnalysisFeatured }) {
  return (
    <a
      href={featured.href}
      className="group flex flex-col no-underline transition-opacity hover:opacity-90 lg:border-r lg:border-border lg:pr-10"
    >
      <div className="relative mb-6 h-[320px] overflow-hidden rounded-sm bg-gradient-to-br from-[#3a5a6d] to-[#2a4250]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={featured.image} alt="" className="absolute inset-0 size-full object-cover" />
      </div>
      <div className="mb-3.5 flex items-center gap-3">
        <Pill variant="solid" className="px-[13px]">
          {featured.category}
        </Pill>
        <span className="text-[13px] text-faint">{featured.date}</span>
      </div>
      <h3 className="m-0 mb-3.5 font-display text-[30px] font-semibold leading-[1.18] tracking-[-0.015em] text-foreground">
        {featured.title}
      </h3>
      <p className="m-0 mb-6 max-w-[520px] text-[16px] leading-[1.6] text-muted-foreground">
        {featured.excerpt}
      </p>
      <span className="text-[14px] font-semibold text-primary transition-colors group-hover:text-secondary">
        {featured.cta}
      </span>
    </a>
  );
}

function SupportingItem({ item }: { item: WbCommentAnalysisItem }) {
  return (
    <a
      href={item.href}
      className="flex flex-col gap-1.5 border-b border-border py-4 no-underline transition-opacity last:border-0 hover:opacity-70"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
          {item.category}
        </span>
        <span className="text-[11.5px] text-faint">{item.date}</span>
      </div>
      <div className="font-display text-[15.5px] font-medium leading-[1.3] text-foreground">
        {item.title}
      </div>
      <div className="text-[12.5px] leading-[1.45] text-muted-foreground">{item.description}</div>
    </a>
  );
}

export function WbCommentAnalysis({
  eyebrow,
  title,
  cta,
  ctaHref = "#",
  featured,
  items,
}: WbCommentAnalysisProps) {
  return (
    <section className="mx-auto max-w-containerMaxW px-containerBase pt-[88px]">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        cta={cta}
        ctaHref={ctaHref}
        divider
        className="mb-9"
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.3fr_1fr]">
        <FeaturedAnalysis featured={featured} />
        <div className="flex flex-col">
          {items.map((item) => (
            <SupportingItem key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
