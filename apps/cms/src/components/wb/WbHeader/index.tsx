import Link from "next/link";

// Presentational WealthBriefing header. Content (tagline, nav, subscribe) is
// supplied by the CMS via collections/Header. The logo is a fixed brand asset;
// the region picker and search are visual-only placeholders for now.

export interface WbHeaderNavItem {
  label: string;
  href: string;
}

export interface WbHeaderProps {
  tagline?: string;
  navItems?: WbHeaderNavItem[];
  subscribe?: { label: string; href: string };
}

const DEFAULT_TAGLINE = "The global wealth management intelligence network";

export function WbHeader({ tagline, navItems = [], subscribe }: WbHeaderProps) {
  return (
    <header className="sticky top-0 z-[200] border-b border-black/10 bg-white/90 backdrop-blur-[14px] backdrop-saturate-[1.8]">
      {/* Region bar */}
      <div className="bg-secondary">
        <div className="mx-auto flex h-[34px] max-w-containerMaxW items-center justify-between gap-6 px-containerBase">
          <span className="text-[12px] font-medium tracking-[0.04em] text-white/90">
            {tagline ?? DEFAULT_TAGLINE}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[12px] uppercase tracking-[0.08em] text-white/55">Region</span>
            <button
              type="button"
              className="flex h-6 items-center gap-2 rounded-pill border border-white/20 bg-white/8 px-2 py-1 text-[12px] font-medium text-white"
            >
              All <span className="text-[10px] text-white/60">▾</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="mx-auto flex h-[72px] max-w-containerMaxW items-center justify-between gap-8 px-containerBase">
        <Link href="/" className="flex flex-shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/wb/wealth-briefing-logo.svg"
            alt="WealthBriefing"
            className="block h-[34px] w-auto"
          />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-[30px] lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-1.5 whitespace-nowrap text-[14.5px] font-medium tracking-[0.005em] text-ink-700 transition-colors hover:text-primary"
            >
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex flex-shrink-0 items-center gap-3.5">
          <button
            type="button"
            aria-label="Search"
            className="flex size-9 items-center justify-center rounded-full border border-black/10 bg-white text-[24px] leading-none text-ink-700 transition-colors hover:border-secondary hover:text-secondary"
          >
            ⌕
          </button>
          {subscribe ? (
            <Link
              href={subscribe.href}
              className="inline-flex h-9 items-center rounded-button bg-primary px-4 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              {subscribe.label}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
