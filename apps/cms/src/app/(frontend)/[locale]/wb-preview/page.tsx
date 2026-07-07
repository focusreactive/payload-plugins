import { WbHero } from "@/blocks/WbHero/ui";
import { WbFooter } from "@/components/wb/WbFooter";
import { WbHeader } from "@/components/wb/WbHeader";

// TEMPORARY visual-check route for the WealthBriefing rebuild. Renders the
// hardcoded header/footer + the Hero section with the design's own content.
// Delete once the Hero is wired into a CMS block + seeded page.

export default function WbPreviewPage() {
  return (
    <>
      <WbHeader />
      <main>
        <WbHero
          eyebrow="Industry hub"
          title="Intelligence for the global wealth management industry"
          date="30 June 2026"
          featured={{
            image: "/wb/readx-8.jpg",
            category: "Investment Strategies",
            brand: "WealthBriefing · UK & Europe",
            title: "EXCLUSIVE: Investment Managers Remain Upbeat On Emerging Markets' Outlook",
            excerpt:
              "Investment managers share their views on the case for emerging markets, tested by recent geopolitical volatility and changing global allocation priorities.",
            cta: "Read latest intelligence",
            href: "#",
          }}
          compactCards={[
            {
              label: "Awards",
              status: "Entries open",
              title: "WealthBriefing Awards Programmes",
              text: "Explore current awards programmes across the wealth management network.",
              cta: "View awards",
              brand: "WealthBriefing",
              href: "#",
            },
            {
              label: "Events & Forums",
              status: "Upcoming",
              title: "Summits, Forums and Breakfast Briefings",
              text: "Join senior wealth management professionals at curated industry events.",
              cta: "View events",
              brand: "WealthBriefing",
              href: "#",
            },
            {
              label: "People Moves",
              status: "30 Jun",
              title: "UBS Makes Raft Of Asia-Pacific Senior Appointments",
              text: "Senior changes affect Taiwan, Singapore, Philippines, Indonesia, Australia and India.",
              cta: "Read update",
              brand: "WealthBriefingAsia",
              href: "#",
            },
          ]}
          todayLinks={[
            {
              brand: "WealthBriefingAsia",
              title: "UBS appoints senior wealth management leaders across APAC",
              href: "#",
            },
            {
              brand: "Family Wealth Report",
              title: "North American family offices adjust private market allocations",
              href: "#",
            },
            {
              brand: "WealthBriefing",
              title: "UK over-55s reluctant to discuss inheritance",
              href: "#",
            },
          ]}
        />
      </main>
      <WbFooter />
    </>
  );
}
