import { emptyResult } from "./context";
import type { SeedContext, SeedStep, StepResult } from "./context";
import { brandTitle, IA } from "./data/ia";
import { pageIdByPath, pageLink, urlLink } from "./links";
import { CTA_TITLE, FOOTER_NAME, HEADER_NAME } from "./seedPages";

/** Upsert a document of `collection` by its `name`/`title` field. */
async function upsertByName(
  ctx: SeedContext,
  collection: "header" | "footer" | "globalBlock",
  field: "name" | "title",
  value: string,
  data: Record<string, unknown>,
  result: StepResult
): Promise<number> {
  const found = await ctx.payload.find({
    collection,
    limit: 1,
    where: { [field]: { equals: value } },
  });
  if (found.docs[0]) {
    // Seed data is shaped by hand; the union of three collections' types is not worth spelling out.
    await ctx.payload.update({
      collection,
      context: ctx.writeContext,
      data: data as never,
      id: found.docs[0].id,
    });
    result.updated++;
    return found.docs[0].id;
  }
  const doc = await ctx.payload.create({
    collection,
    context: ctx.writeContext,
    data: data as never,
  });
  result.created++;
  return doc.id;
}

function childrenOf(parent: string) {
  return IA.filter((page) => page.parent === parent);
}

export const seedChrome: SeedStep = async (ctx) => {
  const result = emptyResult();
  const company = ctx.site.companyName ?? "CT";
  const chrome = ctx.site.chrome;
  const email = chrome.emails[0] ?? "info@example.com";
  const phone = chrome.phones[0] ?? "";
  const title = (path: string) =>
    brandTitle(IA.find((page) => page.path === path)?.title ?? path, company);

  const dropdownLinks = async (paths: string[]) =>
    Promise.all(
      paths.map(async (path) => ({
        description: IA.find((page) => page.path === path)?.summary,
        link: await pageLink(ctx, path, title(path)),
        title: title(path),
      }))
    );

  const featured = async (eyebrow: string, featuredTitle: string, path: string, label: string) => ({
    enabled: true,
    eyebrow,
    link: await pageLink(ctx, path, label),
    title: featuredTitle,
  });

  const header = await upsertByName(
    ctx,
    "header",
    "name",
    HEADER_NAME,
    {
      _status: "published",
      actions: [
        { ...(await pageLink(ctx, "/contact", "Contact us")), appearance: "accent" },
        { ...(await pageLink(ctx, "/who-we-are/careers", "Careers")), appearance: "ghost" },
      ],
      logo: ctx.ids.media.get("logo"),
      name: HEADER_NAME,
      navItems: [
        {
          dropdown: {
            featured: await featured(
              "Featured",
              "Delivering Trustable Software",
              "/technology/trustable-software",
              "Read more"
            ),
            links: await dropdownLinks(childrenOf("/what-we-do").map((page) => page.path)),
          },
          label: "What we do",
          type: "dropdown",
        },
        {
          dropdown: {
            featured: await featured(
              "Sector",
              "Automotive: SDV and functional safety",
              "/sectors/automotive",
              "Explore"
            ),
            links: await dropdownLinks(childrenOf("/sectors").map((page) => page.path)),
          },
          label: "Sectors",
          type: "dropdown",
        },
        {
          dropdown: {
            featured: await featured(
              "Download",
              "Download the TSF safety assessment",
              "/technology/trustable-software-framework",
              "Get the assessment"
            ),
            links: await dropdownLinks(childrenOf("/technology").map((page) => page.path)),
          },
          label: "Technology",
          type: "dropdown",
        },
        {
          dropdown: {
            featured: { enabled: false },
            links: [
              ...(await dropdownLinks(["/resources/news"])),
              { link: await pageLink(ctx, "/blog", "Blog"), title: "Blog" },
              ...(await dropdownLinks([
                "/resources/case-studies",
                "/resources/reports",
                "/resources/events",
              ])),
            ],
          },
          label: "Resources",
          type: "dropdown",
        },
        {
          dropdown: {
            featured: { enabled: false },
            links: await dropdownLinks([
              "/who-we-are",
              "/who-we-are/software-commandments",
              "/who-we-are/partnerships",
              "/who-we-are/environmental-policy",
              "/who-we-are/careers",
            ]),
          },
          label: "Who we are",
          type: "dropdown",
        },
        { label: "CES 2026", link: await pageLink(ctx, "/ces-2026", "CES 2026"), type: "link" },
      ],
    },
    result
  );

  const group = async (label: string, paths: string[]) => ({
    label,
    links: await Promise.all(
      paths.map(async (path) => ({ link: await pageLink(ctx, path, title(path)) }))
    ),
  });

  const isoLine = chrome.certificates
    .map((cert) =>
      cert.certificate ? `${cert.label} certified (${cert.certificate})` : `${cert.label} certified`
    )
    .join(" · ");

  const footer = await upsertByName(
    ctx,
    "footer",
    "name",
    FOOTER_NAME,
    {
      _status: "published",
      copyrightText: chrome.legalLine ?? `© ${company}`,
      description: isoLine || `${company} — open source system software experts.`,
      isoBadges: chrome.certificates.map((cert) => ({
        certificate: cert.certificate,
        label: cert.label,
      })),
      legalLinks: [
        { link: await pageLink(ctx, "/privacy-policy", "Privacy Policy") },
        { link: await pageLink(ctx, "/who-we-are/environmental-policy", "Environmental Policy") },
      ],
      linkGroups: [
        await group(
          "Services",
          childrenOf("/what-we-do").map((page) => page.path)
        ),
        await group(
          "Sectors",
          childrenOf("/sectors").map((page) => page.path)
        ),
        {
          label: "Resources",
          links: [
            { link: await pageLink(ctx, "/resources/news", "News") },
            { link: await pageLink(ctx, "/blog", "Blog") },
            { link: await pageLink(ctx, "/resources/case-studies", "Case Studies") },
            { link: await pageLink(ctx, "/resources/reports", "Reports") },
            { link: await pageLink(ctx, "/resources/events", "Events") },
          ],
        },
        {
          label: "Company",
          links: [
            { link: await pageLink(ctx, "/who-we-are", "About") },
            { link: await pageLink(ctx, "/who-we-are/software-commandments", "Commandments") },
            { link: await pageLink(ctx, "/who-we-are/partnerships", "Partnerships") },
            { link: await pageLink(ctx, "/who-we-are/careers", "Careers") },
            { link: await pageLink(ctx, "/contact", "Contact") },
          ],
        },
      ],
      logo: ctx.ids.media.get("logoOnDark"),
      name: FOOTER_NAME,
      // Profile URLs come from the client later (plan §11.1); "#" until then.
      socialLinks: (["linkedin", "mastodon", "bluesky", "youtube"] as const).map((platform) => ({
        platform,
        url: "#",
      })),
    },
    result
  );

  await upsertByName(
    ctx,
    "globalBlock",
    "title",
    CTA_TITLE,
    {
      _status: "published",
      block: [
        {
          actions: [
            { ...(await pageLink(ctx, "/contact", "Contact us")), appearance: "default" },
            { ...urlLink(`mailto:${email}`, "Email us"), appearance: "ghost" },
          ],
          blockType: "ctaBand",
          description: [email, phone].filter(Boolean).join(" · "),
          eyebrow: "Get in touch",
          heading: `Find out how ${company} can help you`,
          section: { theme: "light-gray" },
        },
      ],
      title: CTA_TITLE,
    },
    result
  );

  // Pages created before the chrome existed get the CT header and footer now.
  for (const page of IA) {
    const id = await pageIdByPath(ctx, page.path);
    if (!id) {
      continue;
    }
    const doc = await ctx.payload.findByID({ collection: "page", depth: 0, id });
    if (doc.header !== header || doc.footer !== footer) {
      await ctx.payload.update({
        collection: "page",
        context: ctx.writeContext,
        data: { footer, header },
        id,
      });
    }
  }

  await ctx.payload.updateGlobal({
    context: ctx.writeContext,
    data: {
      _status: "published",
      adminPanel: { icon: ctx.ids.media.get("mark"), logo: ctx.ids.media.get("logo") },
      blog: {
        description: `Engineering notes, research and news from the ${company} team.`,
        eyebrow: "Blog",
        footer,
        header,
        meta: {
          description: `Articles and news from ${company}.`,
          image: ctx.ids.media.get("og"),
          robots: "index",
          title: "Blog",
        },
        readMoreLabel: "Read more",
        relatedPostsLabel: `More from ${company}`,
        title: "Blog",
      },
      general: { siteName: company },
      notFound: {
        description: "This page moved or never existed.",
        footer,
        header,
        title: "Page not found",
      },
      seo: {
        defaultDescription:
          "Open source system software experts: build engineering, Linux, safety-critical and trustable software.",
        og: { image: ctx.ids.media.get("og"), siteName: company },
        titleSeparator: "|",
        titleSuffix: company,
      },
    },
    slug: "site-settings",
  });
  result.updated++;

  return result;
};
