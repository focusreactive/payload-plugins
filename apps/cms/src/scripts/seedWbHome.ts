import path from "node:path";

import { getPayload } from "payload";
import config from "@payload-config";

// Seeds the WealthBriefing homepage as a real `page` document composed of the
// WB blocks, with the design images uploaded to Media. Idempotent: re-running
// updates the same page and reuses media by alt. Run:
//   bun run payload run src/scripts/seedWbHome.ts

const ASSETS = path.resolve(process.cwd(), "public/wb");

// Build a WB link-field value. Placeholder homepage links are custom URLs;
// editors can switch any of them to an internal reference in the admin. Pass a
// label only for links the design renders text for (section CTAs, card CTAs);
// omit it for whole-card/title links whose text is a sibling field.
const link = (url: string, label?: string) => ({
  type: "custom" as const,
  url,
  ...(label ? { label } : {}),
});

async function main() {
  const payload = await getPayload({ config });

  async function uploadImage(file: string, alt: string): Promise<number> {
    const existing = await payload.find({
      collection: "media",
      where: { alt: { equals: alt } },
      limit: 1,
    });
    const prev = existing.docs[0];
    if (prev) {
      // Reuse only if already stored in Vercel Blob. A local URL
      // (http://localhost.../api/media/file/...) won't resolve on deployed
      // previews — delete and re-upload to Blob.
      if (typeof prev.url === "string" && prev.url.includes("vercel-storage.com")) {
        return prev.id as number;
      }
      await payload.delete({ collection: "media", id: prev.id });
    }
    const doc = await payload.create({
      collection: "media",
      data: { alt },
      filePath: path.join(ASSETS, file),
    });
    return doc.id as number;
  }

  const img = {
    hero: await uploadImage("readx-8.jpg", "WB hero — investment strategies"),
    events: await uploadImage("readx-7.jpg", "WB events — summit"),
    research: await uploadImage("readx-14.jpg", "WB research — AI era"),
    news: await uploadImage("readx-6.jpg", "WB news — inheritance survey"),
    analysis: await uploadImage("readx-13.jpg", "WB analysis — US citizens UK"),
  };

  const blocks = [
    {
      blockType: "wbHero",
      eyebrow: "Industry hub",
      title: "Intelligence for the global wealth management industry",
      date: "30 June 2026",
      featured: {
        image: img.hero,
        category: "Investment Strategies",
        brand: "WealthBriefing · UK & Europe",
        title: "EXCLUSIVE: Investment Managers Remain Upbeat On Emerging Markets' Outlook",
        excerpt:
          "Investment managers share their views on the case for emerging markets, tested by recent geopolitical volatility and changing global allocation priorities.",
        link: link("#", "Read latest intelligence"),
      },
      compactCards: [
        {
          label: "Awards",
          status: "Entries open",
          title: "WealthBriefing Awards Programmes",
          text: "Explore current awards programmes across the wealth management network.",
          brand: "WealthBriefing",
          link: link("#", "View awards"),
        },
        {
          label: "Events & Forums",
          status: "Upcoming",
          title: "Summits, Forums and Breakfast Briefings",
          text: "Join senior wealth management professionals at curated industry events.",
          brand: "WealthBriefing",
          link: link("#", "View events"),
        },
        {
          label: "People Moves",
          status: "30 Jun",
          title: "UBS Makes Raft Of Asia-Pacific Senior Appointments",
          text: "Senior changes affect Taiwan, Singapore, Philippines, Indonesia, Australia and India.",
          brand: "WealthBriefingAsia",
          link: link("#", "Read update"),
        },
      ],
      todayLinks: [
        {
          brand: "WealthBriefingAsia",
          title: "UBS appoints senior wealth management leaders across APAC",
          link: link("#"),
        },
        {
          brand: "Family Wealth Report",
          title: "North American family offices adjust private market allocations",
          link: link("#"),
        },
        {
          brand: "WealthBriefing",
          title: "UK over-55s reluctant to discuss inheritance",
          link: link("#"),
        },
      ],
      showTodayStrip: true,
    },
    {
      blockType: "wbAwards",
      eyebrow: "Awards",
      title: "Upcoming Awards",
      cta: link("#", "Explore awards by brand"),
      items: [
        {
          region: "UK & Europe",
          title: "WealthBriefing",
          description:
            "Recognising leading firms, teams and individuals serving private clients and the wealth management sector across Europe.",
          link: link("#", "View"),
        },
        {
          region: "Asia-Pacific",
          title: "WealthBriefingAsia",
          description:
            "Celebrating excellence and innovation across Asia-Pacific private banking, wealth management and family office services.",
          link: link("#", "View"),
        },
        {
          region: "North America",
          title: "Family Wealth Report",
          description:
            "Highlighting outstanding providers, advisors and technology partners in the North American wealth management market.",
          link: link("#", "View"),
        },
      ],
    },
    {
      blockType: "wbEvents",
      eyebrow: "Events",
      title: "Events & Forums",
      cta: link("#", "View all events"),
      featured: {
        image: img.events,
        pill: "Summit",
        date: "Upcoming 2026",
        location: "London",
        title: "WealthBriefing Summit",
        description:
          "A senior industry gathering focused on strategy, client experience, regulation and technology in wealth management.",
        link: link("#", "View event"),
      },
      events: [
        {
          type: "Breakfast Briefing",
          date: "Ongoing series",
          location: "Major centres",
          title: "Breakfast Briefings",
          description:
            "Exclusive invited discussions with wealth management leaders and specialist partners.",
          link: link("#", "Explore briefings"),
        },
        {
          type: "Forum",
          date: "Upcoming 2026",
          location: "Singapore / HK",
          title: "Asia-Pacific Wealth Management Forum",
          description:
            "Regional industry discussion on private banking, family office trends and cross-border wealth management.",
          link: link("#", "View forum"),
        },
        {
          type: "Forum",
          date: "Upcoming 2026",
          location: "United States",
          title: "Family Wealth Report Forum",
          description:
            "Senior-level discussion for North American family office and wealth management professionals.",
          link: link("#", "View forum"),
        },
      ],
    },
    {
      blockType: "wbBrands",
      eyebrow: "Network",
      title: "Three regional brands.",
      titleSecondLine: "One global wealth management network.",
      subtitle:
        "Connecting wealth management professionals across the UK, Europe, Asia-Pacific and North America.",
      items: [
        {
          number: "01",
          brand: "WealthBriefing",
          description:
            "Daily news, analysis, research, awards and events for the UK and European wealth management community.",
          includes: ["News & Analysis", "Awards", "Events & Forums"],
          latestHighlight:
            "EXCLUSIVE: Investment Managers Remain Upbeat On Emerging Markets' Outlook",
          latestCta: "Enter WealthBriefing",
          link: link("#"),
        },
        {
          number: "02",
          brand: "WealthBriefingAsia",
          description:
            "Regional intelligence for private banking, wealth management and family office professionals across Asia-Pacific.",
          includes: ["People Moves", "Regional Analysis", "Awards & Events"],
          latestHighlight: "UBS Makes Raft Of Asia-Pacific Senior Wealth Management Appointments",
          latestCta: "Enter WealthBriefingAsia",
          link: link("#"),
        },
        {
          number: "03",
          brand: "Family Wealth Report",
          description:
            "Intelligence, analysis and industry programmes for North American family offices and wealth management firms.",
          includes: ["Family Office", "Private Client", "Awards & Forums"],
          latestHighlight: "North American wealth managers adjust to changing client expectations",
          latestCta: "Enter Family Wealth Report",
          link: link("#"),
        },
      ],
    },
    {
      blockType: "wbResearch",
      eyebrow: "Research",
      title: "Latest Research & Intelligence",
      cta: link("#", "Explore research"),
      featured: {
        image: img.research,
        pill: "Research",
        meta: "WealthBriefing Network · 12 March 2026",
        title: "The Private Banker In The AI Era – Impact For Clients, Advisors",
        excerpt:
          "A close look at how artificial intelligence is affecting client relationships, advisor productivity and operating models across wealth management.",
        link: link("#", "Read research"),
      },
      items: [
        {
          date: "2 Mar 2026",
          type: "Analysis",
          title: "Can AI Turbocharge Behavioural Finance?",
          desc: "How behavioural finance insights may be translated into better portfolio decisions and client engagement.",
          link: link("#", "Read more"),
        },
        {
          date: "23 Feb 2026",
          type: "Compliance",
          title: "Ground-breaking Swiss-UK Financial Pact – How Will It Boost Business?",
          desc: "What the Berne Financial Services Agreement means for banks, insurers, wealth managers and clients.",
          link: link("#", "Read more"),
        },
        {
          date: "2026",
          type: "Market Reports",
          title: "Summary Of Q1 2026 Financial Results In Wealth Management, Private Banking",
          desc: "A concise view of quarterly results and performance signals across the sector.",
          link: link("#", "Read more"),
        },
      ],
    },
    {
      blockType: "wbPeople",
      eyebrow: "People Moves",
      title: "Industry Appointments",
      cta: link("#", "View all people moves"),
      items: [
        {
          date: "30 Jun 2026",
          category: "People Moves",
          region: "Asia-Pacific",
          title: "UBS Makes Raft Of Asia-Pacific Senior Wealth Management Appointments",
          link: link("#"),
        },
        {
          date: "30 Jun 2026",
          category: "New Office",
          region: "Europe",
          title: "Westgarth Wines Launches Into European Market; Makes Senior Hire",
          link: link("#"),
        },
        {
          date: "30 Jun 2026",
          category: "Strategy",
          region: "Global",
          title: "IQ-EQ Unifies Gordian Capital Under Global Brand Following Dubai Expansion",
          link: link("#"),
        },
        {
          date: "2026",
          category: "People Moves",
          region: "Europe",
          title: "Mirova Names New CEO",
          link: link("#"),
        },
        {
          date: "2026",
          category: "Collaboration",
          region: "Europe / Japan",
          title: "Lombard Odier And Alpha Japan Bolster Collaboration",
          link: link("#"),
        },
        {
          date: "2026",
          category: "Strategy",
          region: "UK",
          title: "Organic Is Growth Watchword For Mirabaud's UK Wealth Business",
          link: link("#"),
        },
      ],
    },
    {
      blockType: "wbFeatured",
      eyebrow: "Featured",
      title: "Featured Intelligence",
      cta: link("#", "View all features"),
      items: [
        {
          image: img.events,
          category: "Client Affairs",
          brand: "WealthBriefing",
          title: "ANALYSIS: The American Citizen Inflow To UK – What's Driving It?",
          description:
            "A new residency system, lifestyle shifts and US political trends are encouraging HNW Americans to look at the UK.",
          date: "8 May 2026",
          link: link("#"),
        },
        {
          image: img.hero,
          category: "Legal",
          brand: "WealthBriefing",
          title: "ANALYSIS: To Reform Or Leave Alone? – Non-Compete Clauses In The UK",
          description:
            "Wealth managers and private bankers face important questions around employment restrictions and freedom of action.",
          date: "5 May 2026",
          link: link("#"),
        },
        {
          image: img.analysis,
          category: "Legal",
          brand: "WealthBriefing",
          title: "HNW Israel Divorce Court Case Uncovers Hidden Assets – Implications",
          description:
            "Lawyers comment on the implications of offshore structures, foreign corporations and trusts used to shield assets.",
          date: "5 May 2026",
          link: link("#"),
        },
      ],
    },
    {
      blockType: "wbNews",
      eyebrow: "News",
      title: "Latest News",
      cta: link("#", "More News"),
      featured: {
        image: img.news,
        category: "Surveys",
        date: "30 June 2026",
        title: "Over 55s Reluctant To Discuss Inheritance – Mattioli Woods",
        description:
          "Research by YouGov for Mattioli Woods shows that many people over 55 in the UK are still reluctant to discuss inheritance, at a time when tax changes are under the spotlight.",
        byline: "WealthBriefing Editorial",
        link: link("#", "Read story"),
      },
      items: [
        {
          category: "Investment Strategies",
          date: "30 Jun 2026",
          title: "EXCLUSIVE: Investment Managers Remain Upbeat On Emerging Markets' Outlook",
          text: "Managers from Edmond de Rothschild, Guinness Global Investors and Franklin Templeton discuss emerging markets.",
          link: link("#"),
        },
        {
          category: "People Moves",
          date: "30 Jun 2026",
          title: "UBS Makes Raft Of Asia-Pacific Senior Wealth Management Appointments",
          text: "Senior wealth management appointments across several APAC jurisdictions.",
          link: link("#"),
        },
        {
          category: "Strategy",
          date: "30 Jun 2026",
          title: "IQ-EQ Unifies Gordian Capital Under Global Brand Following Dubai Expansion",
          text: "Gordian's client base includes family offices, asset managers and hedge funds.",
          link: link("#"),
        },
        {
          category: "New Office",
          date: "30 Jun 2026",
          title: "Westgarth Wines Launches Into European Market; Makes Senior Hire",
          text: "Specialist fine wine retailer opens a London base and appoints a director of sales.",
          link: link("#"),
        },
      ],
    },
    {
      blockType: "wbAnalysis",
      eyebrow: "Analysis",
      title: "Comment & Analysis",
      cta: link("#", "More Comment & Analysis"),
      featured: {
        image: img.analysis,
        category: "Client Affairs",
        date: "8 May 2026",
        title: "ANALYSIS: The American Citizen Inflow To UK – What's Driving It?",
        excerpt:
          "A new residency system, lifestyle shifts and US political trends are encouraging HNW Americans to look at the UK as lifestyle.",
        link: link("#", "Read analysis"),
      },
      items: [
        {
          category: "Legal",
          date: "5 May 2026",
          title: "ANALYSIS: To Reform Or Leave Alone? – Non-Compete Clauses In The UK",
          description:
            "A look at contractual restrictions affecting wealth managers, private bankers and advisors.",
          link: link("#"),
        },
        {
          category: "Legal",
          date: "5 May 2026",
          title: "HNW Israel Divorce Court Case Uncovers Hidden Assets – Implications",
          description:
            "Lawyers examine the implications of foreign corporations, trusts and hidden asset structures.",
          link: link("#"),
        },
        {
          category: "Strategy",
          date: "12 Mar 2026",
          title: "ANALYSIS: The Private Banker In The AI Era – Impact For Clients, Advisors",
          description:
            "Group editors examine AI's impact on wealth management and advisor-client relationships.",
          link: link("#"),
        },
        {
          category: "Wealth Strategies",
          date: "2 Mar 2026",
          title: "Can AI Turbocharge Behavioural Finance?",
          description:
            "How behavioural finance ideas may be activated through better data and portfolio decision-making.",
          link: link("#"),
        },
      ],
    },
    {
      blockType: "wbMoreRead",
      storiesHeading: "More Stories",
      stories: [
        {
          category: "Financial Results",
          title: "Summary Of Q1 2026 Financial Results In Wealth Management, Private Banking",
          link: link("#"),
        },
        {
          category: "Client Affairs",
          title: "Trusted Relationships, Not Transactions – In Conversation With Meta Octav",
          link: link("#"),
        },
        {
          category: "New Office",
          title: "Westgarth Wines Launches Into European Market; Makes Senior Hire",
          link: link("#"),
        },
        {
          category: "Investment Strategies",
          title: "Lombard Odier And Alpha Japan Bolster Collaboration",
          link: link("#"),
        },
        { category: "People Moves", title: "Mirova Names New CEO", link: link("#") },
      ],
      mostReadHeading: "Most Read",
      mostRead: [
        {
          rank: "01",
          category: "People Moves",
          title: "UBS Makes Raft Of Asia-Pacific Senior Wealth Management Appointments",
          link: link("#"),
        },
        {
          rank: "02",
          category: "Strategy",
          title: '"Organic" Is Growth Watchword For Mirabaud\'s UK Wealth Business',
          link: link("#"),
        },
        {
          rank: "03",
          category: "Investment Strategies",
          title: "The AI Story, Concentration Risk And Shrewd Positioning – A UBP Panel Discussion",
          link: link("#"),
        },
        {
          rank: "04",
          category: "Market Reports",
          title: "AI Creates Investor Cheer In Turbulent Times – Natixis IM",
          link: link("#"),
        },
        {
          rank: "05",
          category: "Strategy",
          title: "Wealth Managers Discuss Brexit Impact 10 Years On",
          link: link("#"),
        },
      ],
    },
    {
      blockType: "wbSponsors",
      eyebrow: "Sponsors & Partners",
      title: "Partner with the wealth management industry's leading intelligence network",
      description:
        "Connect with senior decision-makers through awards, events, research, editorial programmes and targeted sponsorship opportunities.",
      primaryCta: link("#", "Sponsorship opportunities"),
      secondaryCta: link("#", "Download sponsorship pack"),
      trustedLabel: "Trusted by firms across\nthe wealth management industry",
      partnerLogos: [
        "Meridian Capital",
        "Northbridge",
        "Calderwood",
        "Ardent Trust",
        "Vantage Wealth",
      ],
      cards: [
        {
          title: "Awards",
          description:
            "Support leading regional awards programmes and connect your brand with recognised firms, advisors and technology partners.",
          includes: ["Brand visibility", "Ceremony presence", "Winner network access"],
          link: link("#", "Explore"),
        },
        {
          title: "Events",
          description:
            "Participate in curated summits, forums and briefings for senior wealth management professionals.",
          includes: [
            "Speaking opportunities",
            "Senior audience access",
            "Thought leadership positioning",
          ],
          link: link("#", "Explore"),
        },
        {
          title: "Research",
          description:
            "Align your expertise with research, white papers and editorial programmes for targeted professional audiences.",
          includes: ["Research sponsorship", "Content partnerships", "Lead generation support"],
          link: link("#", "Explore"),
        },
      ],
    },
    {
      blockType: "wbSubscribe",
      eyebrow: "WealthBriefing Subscription",
      title: "Best insights only",
      defaultPlanValue: "pro",
      plans: [
        {
          value: "pro",
          title: "Email Pro Newsletter",
          tagLabel: "Paid",
          tagTone: "paid",
          description:
            "A Pro email with exclusive insight, analysis and intelligence from across the WealthBriefing network.",
          cta: "Subscribe",
          note: "Payment handled externally",
        },
        {
          value: "free",
          title: "Weekly News Round-up",
          tagLabel: "Free",
          tagTone: "free",
          description:
            "A free weekly digest of key news, appointments, research and events from the wealth management sector.",
          cta: "Sign up free",
        },
      ],
      privacyLink: link("#", "Privacy Policy"),
    },
  ];

  // WealthBriefing is the site homepage: the root `/` resolves to the page with
  // slug "home", so we upsert onto that doc (replacing any prior home content).
  const slug = "home";
  const existing = await payload.find({
    collection: "page",
    where: { slug: { equals: slug } },
    limit: 1,
    locale: "en",
  });

  const data = {
    title: "WealthBriefing",
    slug,
    _status: "published" as const,
    // Set meta explicitly so the AI-SEO auto-fill hook doesn't run on create.
    meta: {
      title: "WealthBriefing - Intelligence for the global wealth management industry",
      description:
        "The global wealth management intelligence network: news, analysis, awards, events and research across WealthBriefing, WealthBriefingAsia and Family Wealth Report.",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blocks: blocks as any,
  };

  // disableRevalidate: the Page afterChange hook calls Next's revalidateTag,
  // which only works inside a request context (not a standalone script).
  const result = existing.docs[0]
    ? await payload.update({
        collection: "page",
        id: existing.docs[0].id,
        data,
        locale: "en",
        context: { disableRevalidate: true },
      })
    : await payload.create({
        collection: "page",
        data,
        locale: "en",
        context: { disableRevalidate: true },
      });

  payload.logger.info(
    `Seeded WealthBriefing page: id=${result.id} slug=${result.slug} status=${result._status} blocks=${result.blocks?.length}`
  );

  // Remove the earlier standalone "wealthbriefing" page — the homepage now lives
  // on the "home" doc, so that slug is redundant.
  const legacy = await payload.find({
    collection: "page",
    where: { slug: { equals: "wealthbriefing" } },
    limit: 1,
    locale: "en",
  });
  if (legacy.docs[0]) {
    await payload.delete({
      collection: "page",
      id: legacy.docs[0].id,
      context: { disableRevalidate: true },
    });
    payload.logger.info(`Removed legacy page id=${legacy.docs[0].id} slug=wealthbriefing`);
  }
}

// Top-level await so `payload run` (which awaits `import()`) waits for the seed
// to finish before the process exits.
try {
  await main();
  process.exit(0);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
}
