import { Fragment } from "react";

import { Eyebrow } from "@/components/wb/primitives";

import type { WbSponsorCard, WbSponsorsProps } from "./types";

function SponsorCard({ card }: { card: WbSponsorCard }) {
  return (
    <div className="flex flex-col rounded-sm border border-border bg-white px-[26px] py-7 transition-colors hover:border-secondary">
      <h3 className="m-0 mb-4 font-display text-[20px] font-semibold tracking-[-0.01em] text-foreground">
        {card.title}
      </h3>
      <p className="m-0 mb-6 text-[14px] leading-[1.55] text-muted-foreground">
        {card.description}
      </p>
      <div className="mb-8 flex flex-col gap-2">
        {card.includes.map((item) => (
          <div key={item} className="flex items-center gap-2.5 text-[14px] text-ink-700">
            <span className="size-[5px] shrink-0 rounded-full bg-primary" />
            {item}
          </div>
        ))}
      </div>
      <a
        href={card.href ?? "#"}
        className="mt-auto text-[14px] font-semibold text-primary no-underline transition-colors hover:text-secondary"
      >
        {card.cta}
      </a>
    </div>
  );
}

export function WbSponsors({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  trustedLabel,
  partnerLogos,
  cards,
}: WbSponsorsProps) {
  const trustedLines = trustedLabel.split("\n");

  return (
    <section className="mt-24 bg-wash py-[84px]">
      <div className="mx-auto max-w-containerMaxW px-containerBase">
        <div className="mb-12 grid grid-cols-1 items-start gap-14 md:grid-cols-2">
          <div>
            <Eyebrow className="mb-4">{eyebrow}</Eyebrow>
            <h2 className="m-0 font-display text-[34px] font-semibold leading-[1.14] tracking-[-0.02em] text-foreground">
              {title}
            </h2>
          </div>
          <div className="pt-8">
            <p className="m-0 mb-6 text-[16px] leading-[1.6] text-muted-foreground">
              {description}
            </p>
            <div className="flex flex-wrap gap-[14px]">
              <a
                href={primaryCta.href ?? "#"}
                className="inline-block rounded-button bg-primary px-6 py-3 text-[14px] font-semibold text-white no-underline transition-colors hover:bg-primary-hover"
              >
                {primaryCta.label}
              </a>
              <a
                href={secondaryCta.href ?? "#"}
                className="inline-block rounded-button border border-border bg-white px-6 py-3 text-[14px] font-semibold text-secondary no-underline transition-colors hover:border-secondary"
              >
                {secondaryCta.label}
              </a>
            </div>
          </div>
        </div>

        <div className="mb-12 flex items-center gap-10 border-y border-border py-7">
          <div className="shrink-0 whitespace-nowrap border-r border-border pr-10 text-[12px] uppercase tracking-[0.1em] text-faint">
            {trustedLines.map((line, index) => (
              <Fragment key={line}>
                {index > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-between gap-6">
            {partnerLogos.map((logo) => (
              <span
                key={logo}
                className="whitespace-nowrap font-display text-[17px] font-semibold tracking-[-0.01em] text-faint opacity-80 transition-colors hover:text-secondary hover:opacity-100"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {cards.map((card) => (
            <SponsorCard key={card.title} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
