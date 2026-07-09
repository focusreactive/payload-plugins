// Presentational WealthBriefing footer. Content (columns, contact, newsletter,
// copyright) is supplied by the CMS via collections/Footer. The logo is a fixed
// brand asset; the newsletter form is visual-only for now.

export interface WbFooterLink {
  label: string;
  href: string;
}

export interface WbFooterColumn {
  title: string;
  links: WbFooterLink[];
}

export interface WbFooterProps {
  description?: string;
  columns?: WbFooterColumn[];
  contact?: {
    companyName?: string;
    address?: string;
    phoneLabel?: string;
    phone?: string;
  };
  newsletter?: {
    heading?: string;
    placeholder?: string;
    submitLabel?: string;
  };
  copyright?: string;
}

export function WbFooter({
  description,
  columns = [],
  contact,
  newsletter,
  copyright,
}: WbFooterProps) {
  return (
    <footer className="mt-24 bg-black text-white">
      <div className="mx-auto max-w-containerMaxW px-containerBase pt-[72px]">
        <div className="grid grid-cols-1 gap-8 border-b border-white/16 pb-14 md:grid-cols-2 lg:grid-cols-[1.7fr_repeat(5,1fr)]">
          <div className="max-w-[300px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/wb/wealth-briefing-logo-white.svg"
              alt="WealthBriefing"
              className="block h-9 w-auto"
            />
            {description ? (
              <p className="mt-4 text-[13.5px] leading-[1.6] text-faint">{description}</p>
            ) : null}
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <div className="mb-4 text-[12px] font-medium tracking-[0.06em] text-white">
                {col.title}
              </div>
              <div className="flex flex-col gap-[11px]">
                {col.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-[13.5px] text-faint transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-10 border-b border-white/16 py-10 md:grid-cols-3">
          <div>
            <div className="mb-2 text-[12px] font-medium text-white">{contact?.companyName}</div>
            <div className="whitespace-pre-line text-[13px] leading-[1.6] text-faint">
              {contact?.address}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[12px] font-medium text-white">{contact?.phoneLabel}</div>
            <div className="text-[13px] text-faint">{contact?.phone}</div>
          </div>
          <div>
            <div className="mb-2 text-[12px] font-medium text-white">{newsletter?.heading}</div>
            <div className="relative flex max-w-[340px]">
              <input
                placeholder={newsletter?.placeholder}
                className="w-full rounded-button border-none bg-white py-3 pl-4 pr-[130px] text-[13.5px] text-ink-900 outline-none"
              />
              <button
                type="button"
                className="absolute inset-y-1 right-1 rounded-[4px] bg-primary px-5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                {newsletter?.submitLabel}
              </button>
            </div>
          </div>
        </div>

        {copyright ? <div className="py-6 text-[13px] text-faint">{copyright}</div> : null}
      </div>
    </footer>
  );
}
