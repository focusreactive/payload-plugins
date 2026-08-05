import { getPayload } from "payload";

import { richText } from "./lib/lexical";
import config from "./payload.config";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@admin.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin";
const MCP_API_KEY = process.env.MCP_API_KEY ?? "";

const CATEGORIES = [
  { title: "Engineering", slug: "engineering" },
  { title: "Product", slug: "product" },
  { title: "Design", slug: "design" },
  { title: "Company", slug: "company" },
  { title: "Research", slug: "research" },
];

const AUTHORS = [
  { name: "Ada Okonkwo", bio: "Writes about platform engineering and developer tooling." },
  { name: "Ruben Salas", bio: "Product lead. Interested in how teams ship faster." },
  { name: "Mira Lindqvist", bio: "Design systems, typography, and interface craft." },
  { name: "Tomas Brenner", bio: "Applied research and evaluation." },
];

const TOPICS = [
  "Choosing a rendering strategy",
  "Designing resilient background jobs",
  "A pragmatic approach to feature flags",
  "Reducing cold starts in serverless apps",
  "What good API versioning looks like",
  "Structuring a design system for scale",
  "Measuring what actually matters",
  "Writing migrations you can roll back",
  "Caching without the cache invalidation pain",
  "Observability on a small team",
  "The cost of premature abstraction",
  "Onboarding engineers in their first week",
  "Making code review faster",
  "When to build versus buy",
  "Content modelling for editors, not developers",
  "Localization beyond string tables",
  "Accessible forms from the ground up",
  "Typed boundaries between services",
  "Deleting code as a feature",
  "Incident reviews without blame",
  "Search relevance for small corpora",
  "Pricing pages that explain themselves",
  "Instrumenting the editor experience",
  "A short guide to database indexes",
  "Progressive delivery in practice",
  "How we run design critique",
  "Testing what users actually do",
  "Reading production logs effectively",
  "Documentation that stays current",
  "Planning quarters without theatre",
];

const run = async () => {
  const payload = await getPayload({ config });

  if (!MCP_API_KEY) {
    throw new Error("MCP_API_KEY is not set — the agent cannot authenticate against /api/mcp.");
  }

  const existingUsers = await payload.find({
    collection: "users",
    where: { email: { equals: ADMIN_EMAIL } },
    limit: 1,
  });

  const adminId =
    existingUsers.docs[0]?.id ??
    (
      await payload.create({
        collection: "users",
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: "Demo Admin" },
      })
    ).id;

  const crud = { create: true, delete: true, find: true, update: true };

  const keyData = {
    apiKey: MCP_API_KEY,
    authors: crud,
    categories: crud,
    description: "Seeded local dev key for the content agent",
    enableAPIKey: true,
    label: "Content Agent (local dev)",
    media: crud,
    pages: crud,
    posts: crud,
    siteSettings: { find: true, update: true },
    user: adminId,
  };

  const existingKeys = await payload.find({
    collection: "payload-mcp-api-keys",
    where: { label: { equals: keyData.label } },
    limit: 1,
  });

  const existingKeyId = existingKeys.docs[0]?.id;
  if (existingKeyId) {
    await payload.update({
      collection: "payload-mcp-api-keys",
      id: existingKeyId,
      data: keyData,
    });
  } else {
    await payload.create({ collection: "payload-mcp-api-keys", data: keyData });
  }

  await payload.delete({ collection: "posts", where: { id: { exists: true } } });
  await payload.delete({ collection: "pages", where: { id: { exists: true } } });
  await payload.delete({ collection: "categories", where: { id: { exists: true } } });
  await payload.delete({ collection: "authors", where: { id: { exists: true } } });

  const categoryIds: number[] = [];
  for (const category of CATEGORIES) {
    const created = await payload.create({ collection: "categories", data: category });
    categoryIds.push(created.id);
  }

  const authorIds: number[] = [];
  for (const author of AUTHORS) {
    const created = await payload.create({ collection: "authors", data: author });
    authorIds.push(created.id);
  }

  for (const [index, topic] of TOPICS.entries()) {
    const slug = topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "");

    await payload.create({
      collection: "posts",
      data: {
        _status: index < 24 ? "published" : "draft",
        authors: [authorIds[index % authorIds.length]],
        categories: [categoryIds[index % categoryIds.length]],
        content: richText(
          `${topic} is one of those decisions that looks small until it is load-bearing.`,
          "This post walks through the tradeoffs we weighed, what we shipped, and what we would do differently. Read more at https://example.com/handbook for the longer version.",
          "If you take one thing away: pick the option you can reverse cheaply."
        ),
        excerpt: `A practical look at ${topic.toLowerCase()} and the tradeoffs involved.`,
        publishedAt: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
        slug,
        title: topic,
      },
    });
  }

  await payload.create({
    collection: "pages",
    data: {
      _status: "published",
      blocks: [
        {
          blockType: "hero",
          heading: "Content that keeps up with you",
          subheading: "A demo CMS wired to an AI content agent.",
        },
        {
          blockType: "content",
          body: richText(
            "This page was composed from blocks: a hero, this content section, an FAQ, and a call to action.",
            "Ask the agent to add a section, rewrite this paragraph, or translate the page into Spanish. Every change lands as a draft for you to review."
          ),
        },
        {
          blockType: "faq",
          heading: "Frequently asked questions",
          items: [
            {
              question: "Can the agent publish on its own?",
              answer: richText(
                "No. Writes are forced to drafts and surfaced in the review panel for a human to approve."
              ),
            },
            {
              question: "Does it understand this schema?",
              answer: richText(
                "Yes — it introspects the Payload config at runtime, so new collections and blocks are understood without configuration."
              ),
            },
            {
              question: "Where does its memory live?",
              answer: richText(
                "In a separate `content_agent` Postgres schema, alongside this app's own tables."
              ),
            },
          ],
        },
        {
          blockType: "cta",
          buttonLabel: "Read the blog",
          buttonUrl: "/en/blog",
          heading: "See what the agent has been writing",
        },
      ],
      slug: "home",
      title: "Home",
    },
  });

  await payload.create({
    collection: "pages",
    data: {
      _status: "published",
      blocks: [
        {
          blockType: "hero",
          heading: "About this demo",
          subheading: "Six collections, four blocks, two locales.",
        },
        {
          blockType: "content",
          body: richText(
            "The schema here exists to exercise the agent: block editing, array rows, surgical rich-text edits, translation, and bulk find-and-replace across thirty posts.",
            "Nothing in this app is shared with the production CMS."
          ),
        },
      ],
      slug: "about",
      title: "About",
    },
  });

  await payload.create({
    collection: "pages",
    data: {
      _status: "draft",
      blocks: [
        {
          blockType: "hero",
          heading: "Pricing",
          subheading: "Left as a draft on purpose.",
        },
        {
          blockType: "cta",
          buttonLabel: "Talk to us",
          buttonUrl: "/en/about",
          heading: "Questions about pricing?",
        },
      ],
      slug: "pricing",
      title: "Pricing",
    },
  });

  await payload.updateGlobal({
    slug: "site-settings",
    data: {
      _status: "published",
      nav: [
        { label: "Home", url: "/en" },
        { label: "About", url: "/en/about" },
        { label: "Blog", url: "/en/blog" },
      ],
      siteName: "Content Agent Demo",
    },
  });

  payload.logger.info(
    `Seeded 30 posts, 3 pages, ${AUTHORS.length} authors, ${CATEGORIES.length} categories.`
  );
  payload.logger.info(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  payload.logger.info("MCP API key seeded from MCP_API_KEY — the agent is ready to chat.");
};

await run();
process.exit(0);
