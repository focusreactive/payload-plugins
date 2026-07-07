import type { WbHeroCompactCard, WbHeroProps, WbHeroTodayLink } from "./types";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3.5 inline-flex items-center gap-2 text-eyebrow text-primary">
      <span className="size-1.5 rounded-full bg-primary" />
      {children}
    </div>
  );
}

function FeaturedCard({ featured }: { featured: WbHeroProps["featured"] }) {
  return (
    <a
      href={featured.href}
      className="group relative flex min-h-[520px] flex-col justify-end overflow-hidden rounded-sm bg-secondary no-underline"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={featured.image} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(13,21,27,0.5)] to-[rgba(9,16,21,0.95)]" />
      <div className="relative p-8 pr-12 text-white">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="whitespace-nowrap rounded-pill bg-white/20 px-3.5 py-1.5 text-[12.5px] font-medium text-white">
            {featured.category}
          </span>
          <span className="text-[12px] tracking-[0.04em] text-white/70">{featured.brand}</span>
        </div>
        <h2 className="m-0 mb-3.5 max-w-[640px] font-display text-[31px] font-semibold leading-[1.16] tracking-[-0.015em]">
          {featured.title}
        </h2>
        <p className="m-0 mb-5 max-w-[600px] text-[15.5px] leading-[1.55] text-white/[0.78]">
          {featured.excerpt}
        </p>
        <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-white">
          {featured.cta}{" "}
          <span className="text-[13px] transition-transform group-hover:translate-x-1">→</span>
        </span>
      </div>
    </a>
  );
}

function CompactCard({ card }: { card: WbHeroCompactCard }) {
  return (
    <a
      href={card.href}
      className="flex flex-1 flex-col justify-center gap-2.5 rounded-sm border border-border bg-white px-[22px] py-5 no-underline transition-colors hover:border-secondary hover:bg-wash"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-secondary">
          {card.label}
        </span>
        <span className="text-[12px] text-faint">{card.status}</span>
      </div>
      <div className="font-display text-[16.5px] font-semibold leading-[1.3] text-foreground">
        {card.title}
      </div>
      <div className="text-[13.5px] leading-[1.5] text-muted-foreground">{card.text}</div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-primary">{card.cta}</span>
        <span className="text-[11.5px] text-faint">{card.brand}</span>
      </div>
    </a>
  );
}

function TodayStrip({ links }: { links: WbHeroTodayLink[] }) {
  return (
    <div className="mt-7 grid grid-cols-1 items-center gap-x-8 gap-y-5 border-y border-border py-[18px] md:grid-cols-[auto_1fr_1fr_1fr]">
      <span className="text-[11px] font-semibold uppercase leading-tight tracking-[0.12em] text-faint">
        Today across
        <br />
        the network
      </span>
      {links.map((link) => (
        <a
          key={link.title}
          href={link.href}
          className="flex flex-col gap-1 border-border pl-6 no-underline transition-opacity hover:opacity-70 md:border-l"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
            {link.brand}
          </span>
          <span className="font-display text-[14px] font-medium leading-[1.35] text-ink-700">
            {link.title}
          </span>
        </a>
      ))}
    </div>
  );
}

export function WbHero({
  eyebrow,
  title,
  date,
  featured,
  compactCards,
  todayLinks,
  showTodayStrip = true,
}: WbHeroProps) {
  return (
    <section className="mx-auto max-w-containerMaxW px-containerBase pt-14">
      <div className="mb-[30px] flex items-end justify-between gap-6">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="m-0 max-w-[760px] font-display text-[42px] font-semibold leading-[1.08] tracking-[-0.02em] text-foreground">
            {title}
          </h1>
        </div>
        <div className="whitespace-nowrap pb-1.5 text-[14px] text-faint">{date}</div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.55fr_1fr]">
        <FeaturedCard featured={featured} />
        <div className="flex flex-col gap-4">
          {compactCards.map((card) => (
            <CompactCard key={card.title} card={card} />
          ))}
        </div>
      </div>

      {showTodayStrip && todayLinks.length > 0 && <TodayStrip links={todayLinks} />}
    </section>
  );
}
