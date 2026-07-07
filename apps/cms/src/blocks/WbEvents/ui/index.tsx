import { Pill, SectionHeader } from "@/components/wb/primitives";

import type { WbEventsCard, WbEventsFeatured, WbEventsProps } from "./types";

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
      width="14"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      height="12"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="12"
    >
      <rect height="17" rx="2" width="18" x="3" y="4.5" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      height="12"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="12"
    >
      <path d="M12 21.5s7-6.2 7-11.5a7 7 0 1 0-14 0c0 5.3 7 11.5 7 11.5z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function FeaturedEvent({ featured }: { featured: WbEventsFeatured }) {
  return (
    <a
      href={featured.href ?? "#"}
      className="group relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-sm bg-[linear-gradient(155deg,#3a5a6d,#28404e)] no-underline"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={featured.image} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,24,30,0)_0%,rgba(13,21,27,0.5)_58%,rgba(9,16,21,0.95)_100%)]" />
      <div className="relative p-8 pr-10 text-white">
        <div className="mb-3.5 flex flex-wrap items-start gap-2.5 text-[12px] text-white/[0.78]">
          <Pill variant="onImage">{featured.pill}</Pill>
          <span className="inline-flex items-center gap-[7px]">
            <CalendarIcon />
            {featured.date}
          </span>
          <span className="inline-flex items-center gap-[7px]">
            <LocationIcon />
            {featured.location}
          </span>
        </div>
        <h3 className="m-0 mb-3 font-display text-[26px] font-semibold leading-[1.18]">
          {featured.title}
        </h3>
        <p className="m-0 mb-[18px] max-w-[440px] text-[14.5px] leading-[1.5] text-white/[0.78]">
          {featured.description}
        </p>
        <span className="inline-flex items-center gap-[7px] text-[14px] font-semibold text-white">
          {featured.cta}
          <ArrowIcon className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </a>
  );
}

function EventCard({ event }: { event: WbEventsCard }) {
  return (
    <a
      href={event.href ?? "#"}
      className="group flex flex-1 flex-col gap-2 rounded-sm border border-border bg-white p-[22px] no-underline transition-colors hover:border-secondary"
    >
      {/* Card hover recolors the type/date/location/title to primary red in one
          move (comp `.wb-event-card:hover .wb-ev-text`); the separators and body
          copy deliberately stay put. */}
      <div className="flex flex-wrap items-start gap-2 text-[11px]">
        <span className="whitespace-nowrap font-semibold uppercase tracking-[0.1em] text-secondary transition-colors group-hover:text-primary">
          {event.type}
        </span>
        <span className="text-border">·</span>
        <span className="whitespace-nowrap text-faint transition-colors group-hover:text-primary">
          {event.date}
        </span>
        <span className="text-border">·</span>
        <span className="whitespace-nowrap text-faint transition-colors group-hover:text-primary">
          {event.location}
        </span>
      </div>
      <div className="font-display text-[17px] font-semibold leading-[1.25] text-foreground transition-colors group-hover:text-primary">
        {event.title}
      </div>
      <div className="flex-1 text-[13px] leading-[1.5] text-muted-foreground">
        {event.description}
      </div>
      <span className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
        {event.cta}
        <ArrowIcon className="transition-transform group-hover:translate-x-1" />
      </span>
    </a>
  );
}

export function WbEvents({ eyebrow, title, cta, ctaHref = "#", featured, events }: WbEventsProps) {
  return (
    <section className="mx-auto max-w-containerMaxW px-containerBase pt-[84px]">
      <SectionHeader className="pb-8" cta={cta} ctaHref={ctaHref} eyebrow={eyebrow} title={title} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <FeaturedEvent featured={featured} />
        <div className="flex flex-col gap-5">
          {events.map((event) => (
            <EventCard event={event} key={event.title} />
          ))}
        </div>
      </div>
    </section>
  );
}
