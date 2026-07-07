/**
 * Hardcoded WealthBriefing site footer. Static content for now (per brief).
 */

const FOOTER_COLUMNS: { title: string; links: string[] }[] = [
  {
    title: "Brands",
    links: [
      "WealthBriefing",
      "WealthBriefingAsia",
      "Family Wealth Report",
      "ClearView Financial Media",
    ],
  },
  {
    title: "News & Intelligence",
    links: [
      "Comment & Analysis",
      "News",
      "Compliance Matters",
      "People Moves",
      "Market Reports",
      "Technology",
    ],
  },
  {
    title: "Commercial",
    links: [
      "Awards",
      "Events & Forums",
      "Sponsors & Partners",
      "Advertise",
      "Download sponsorship pack",
    ],
  },
  { title: "Company", links: ["About", "Contact", "Editorial Board", "Research", "WealthTalk"] },
  {
    title: "Legal",
    links: ["Terms & Conditions", "Privacy Policy", "Disclaimer", "Reprint Rights"],
  },
];

export function WbFooter() {
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
            <p className="mt-4 text-[13.5px] leading-[1.6] text-faint">
              WealthBriefing is a global daily news and analysis service for the wealth management
              industry, published by ClearView Financial Media.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="mb-4 text-[12px] font-medium tracking-[0.06em] text-white">
                {col.title}
              </div>
              <div className="flex flex-col gap-[11px]">
                {col.links.map((link) => (
                  <a
                    key={link}
                    href="#"
                    className="text-[13.5px] text-faint transition-colors hover:text-white"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-10 border-b border-white/16 py-10 md:grid-cols-3">
          <div>
            <div className="mb-2 text-[12px] font-medium text-white">
              ClearView Financial Media Ltd
            </div>
            <div className="text-[13px] leading-[1.6] text-faint">
              Audley House, 13 Palace Street,
              <br />
              London SW1E 5HX
            </div>
          </div>
          <div>
            <div className="mb-2 text-[12px] font-medium text-white">Phone</div>
            <div className="text-[13px] text-faint">+44 (0)207 148 0188</div>
          </div>
          <div>
            <div className="mb-2 text-[12px] font-medium text-white">Subscribe to updates</div>
            <div className="relative flex max-w-[340px]">
              <input
                placeholder="Email address"
                className="w-full rounded-button border-none bg-white py-3 pl-4 pr-[130px] text-[13.5px] text-ink-900 outline-none"
              />
              <button
                type="button"
                className="absolute inset-y-1 right-1 rounded-[4px] bg-primary px-5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                Submit
              </button>
            </div>
          </div>
        </div>

        <div className="py-6 text-[13px] text-faint">
          © ClearView Financial Media Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
