import { getPayload } from "payload";
import sharp from "sharp";

import config from "./payload.config";

// Seeds the dev SQLite DB with content in the `en` source locale only, so the translator
// plugin has saved sources to translate FROM (de/fr/es stay empty on purpose). Run from apps/dev:
//   bun run seed
//
// Idempotent: the content collections (pages, articles, playground) are wiped and recreated on
// every run, the admin user is find-or-created (never duplicated), and the Header global is
// upserted. So you always end up with the same known dataset — safe to re-run after `rm dev.db`.
// The relations-graph demo data (one media file, authors, categories) is find-or-created by
// name, then linked from the recreated articles, pages, playground doc and Header global.

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "dev@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "dev123456";

// --- Lexical node builders (Payload default editor) ------------------------------------------
// Child nodes are typed loosely by Payload (root.children is `{ [k]: unknown; type; version }[]`),
// so only the root needs the narrow `as const` on direction/format — the rest is free-form.
type LexNode = { type: string; version: number; [k: string]: unknown };
type Inline = string | LexNode;

// Inline text. `format` is a bitmask: bold=1, italic=2, underline=8, code=16.
const BOLD = 1;
const ITALIC = 2;
const UNDERLINE = 8;
const CODE = 16;
const txt = (text: string, format = 0): LexNode => ({
  type: "text",
  detail: 0,
  format,
  mode: "normal",
  style: "",
  text,
  version: 1,
});
const link = (text: string, url: string): LexNode => ({
  type: "link",
  fields: { linkType: "custom", newTab: true, url },
  children: [txt(text)],
  direction: "ltr",
  format: "",
  indent: 0,
  version: 3,
});
// Inline children may be plain strings (→ text nodes) or pre-built nodes (txt/link).
const asNode = (x: Inline): LexNode => (typeof x === "string" ? txt(x) : x);

// Block-level nodes.
const para = (...children: Inline[]): LexNode => ({
  type: "paragraph",
  children: children.map(asNode),
  direction: "ltr",
  format: "",
  indent: 0,
  textFormat: 0,
  version: 1,
});
const heading = (tag: "h2" | "h3", ...children: Inline[]): LexNode => ({
  type: "heading",
  tag,
  children: children.map(asNode),
  direction: "ltr",
  format: "",
  indent: 0,
  version: 1,
});
const quote = (...children: Inline[]): LexNode => ({
  type: "quote",
  children: children.map(asNode),
  direction: "ltr",
  format: "",
  indent: 0,
  version: 1,
});
const li = (...children: Inline[]): LexNode => ({
  type: "listitem",
  value: 1,
  children: children.map(asNode),
  direction: "ltr",
  format: "",
  indent: 0,
  version: 1,
});

// A list. Items may be plain strings, pre-built `li(...)` rows (for inline formatting), or a
// nested `list(...)` (wrapped in a listitem to indent it) — so lists can nest arbitrarily.
const list = (listType: "bullet" | "number", ...items: (string | LexNode)[]): LexNode => ({
  type: "list",
  listType,
  tag: listType === "bullet" ? "ul" : "ol",
  start: 1,
  children: items.map((item, i) => {
    const node = typeof item === "string" ? li(item) : item.type === "listitem" ? item : li(item);
    return { ...node, value: i + 1 };
  }),
  direction: "ltr",
  format: "",
  indent: 0,
  version: 1,
});

// Root wrapper. Pass block-level nodes. The `as const` on the root is required — Payload types
// root.direction/format as unions, and a bare string literal widens to `string` otherwise.
const doc = (...children: LexNode[]) => ({
  root: {
    type: "root",
    children,
    direction: "ltr" as const,
    format: "" as const,
    indent: 0,
    version: 1,
  },
});

// hero + content blocks both pass through withSectionVisibility, which only adds an optional
// hidden checkbox — no extra required data needed here.
const heroBlock = (title: string, description: string, ctaLabel: string) => ({
  blockType: "hero" as const,
  title,
  description,
  cta: [{ label: ctaLabel, url: "#" }],
});

const contentBlock = (content: ReturnType<typeof doc>) => ({
  blockType: "content" as const,
  content,
});

// --- Relations-graph demo data ---------------------------------------------------------------
// Links the content above so the graph, the "where is this used?" drawer and the insights have
// real data: hasMany, polymorphic, self-reference, uploads, a global, a relation inside localized
// blocks (en and de differ), one three blocks deep in a drafts collection, and one that exists
// only in a page's unpublished draft.
type Payload = Awaited<ReturnType<typeof getPayload>>;

const DEMO_IMAGE_ALT = "Relations demo image";

const findOrCreateMedia = async (payload: Payload): Promise<number> => {
  const existing = await payload.find({
    collection: "media",
    limit: 1,
    where: { alt: { equals: DEMO_IMAGE_ALT } },
  });
  if (existing.docs[0]) {
    return existing.docs[0].id;
  }
  const data = await sharp({
    create: { background: "#3b82f6", channels: 3, height: 64, width: 64 },
  })
    .png()
    .toBuffer();
  const created = await payload.create({
    collection: "media",
    data: { alt: DEMO_IMAGE_ALT, title: "Demo image" },
    file: { data, mimetype: "image/png", name: "relations-demo.png", size: data.length },
  });
  return created.id;
};

const findOrCreateCategory = async (
  payload: Payload,
  title: string,
  parent?: number
): Promise<number> => {
  const existing = await payload.find({
    collection: "categories",
    limit: 1,
    where: { title: { equals: title } },
  });
  if (existing.docs[0]) {
    return existing.docs[0].id;
  }
  return (await payload.create({ collection: "categories", data: { parent, title } })).id;
};

const findOrCreateAuthor = async (
  payload: Payload,
  name: string,
  avatar?: number
): Promise<number> => {
  const existing = await payload.find({
    collection: "authors",
    limit: 1,
    where: { name: { equals: name } },
  });
  if (existing.docs[0]) {
    return existing.docs[0].id;
  }
  return (await payload.create({ collection: "authors", data: { avatar, name } })).id;
};

const seedRelations = async (
  payload: Payload,
  ids: {
    articleIds: Record<string, number>;
    pageIds: Record<string, number>;
    playgroundId: number;
  }
) => {
  const { articleIds, pageIds, playgroundId } = ids;
  const first = articleIds["First article"];
  const wordOrder = articleIds["Word order"];
  const second = articleIds["Second article"];
  const home = pageIds.home;
  const about = pageIds.about;
  if (!(first && wordOrder && second && home && about)) {
    throw new Error("Relations demo: expected seeded articles and pages are missing");
  }

  const image = await findOrCreateMedia(payload);
  const news = await findOrCreateCategory(payload, "News");
  const engineering = await findOrCreateCategory(payload, "Engineering", news);
  const product = await findOrCreateCategory(payload, "Product", news);
  const ada = await findOrCreateAuthor(payload, "Ada Lovelace", image);
  const alan = await findOrCreateAuthor(payload, "Alan Turing");

  const links: { id: number; data: Record<string, unknown> }[] = [
    { data: { authors: [ada, alan], category: engineering, cover: image }, id: first },
    {
      data: {
        authors: [ada],
        category: engineering,
        related: [{ relationTo: "articles", value: first }],
      },
      id: wordOrder,
    },
    {
      data: {
        authors: [alan],
        category: product,
        related: [
          { relationTo: "articles", value: first },
          { relationTo: "pages", value: home },
        ],
      },
      id: second,
    },
  ];
  for (const { data, id } of links) {
    await payload.update({ collection: "articles", data, id });
  }

  // Home: hero image + a content block listing articles; the de locale lists a different one.
  const homeDoc = await payload.findByID({ collection: "pages", depth: 0, id: home, locale: "en" });
  const withLinks = (articles: number[]) =>
    (homeDoc.sections ?? []).map((section) =>
      section.blockType === "hero" ? { ...section, image } : { ...section, articles }
    );
  await payload.update({
    collection: "pages",
    data: { sections: withLinks([first, second]) },
    id: home,
    locale: "en",
  });
  // Localized blocks: row ids are unique across locales, so the de copy needs fresh ones.
  const freshIds = withLinks([wordOrder]).map(({ id: _id, ...section }) =>
    "cta" in section
      ? { ...section, cta: (section.cta ?? []).map(({ id: _ctaId, ...cta }) => cta) }
      : section
  );
  await payload.update({
    collection: "pages",
    data: { sections: freshIds, title: "Startseite" },
    id: home,
    locale: "de",
  });

  // About: the reference exists only in an unpublished draft.
  const aboutDoc = await payload.findByID({
    collection: "pages",
    depth: 0,
    id: about,
    locale: "en",
  });
  await payload.update({
    collection: "pages",
    data: {
      sections: (aboutDoc.sections ?? []).map((section) =>
        section.blockType === "content" ? { ...section, articles: [second] } : section
      ),
    },
    draft: true,
    id: about,
    locale: "en",
  });

  // Playground: a relation three blocks deep (layout → nested → leaves).
  const playgroundDoc = await payload.findByID({
    collection: "playground",
    depth: 0,
    id: playgroundId,
    locale: "en",
  });
  await payload.update({
    collection: "playground",
    data: {
      layout: (playgroundDoc.layout ?? []).map((block) => ({
        ...block,
        nested: (block.nested ?? []).map((inner) => ({
          ...inner,
          leaves: (inner.leaves ?? []).map((leaf) => ({ ...leaf, category: engineering })),
        })),
      })),
    },
    id: playgroundId,
    locale: "en",
  });

  await payload.updateGlobal({
    data: {
      featured: first,
      nav: [
        { label: "Home", link: { relationTo: "pages", value: home } },
        { label: "First article", link: { relationTo: "articles", value: first } },
      ],
    },
    slug: "header",
  });

  payload.logger.info("Seeded relations-graph demo links");
};

const run = async () => {
  const payload = await getPayload({ config });
  const wipe = (collection: "pages" | "articles" | "playground") =>
    payload.delete({ collection, where: { id: { exists: true } } });

  // --- Admin user (find-or-create; never duplicated) -----------------------------------------
  const existingUser = await payload.find({
    collection: "users",
    where: { email: { equals: ADMIN_EMAIL } },
    limit: 1,
  });
  if (existingUser.docs.length === 0) {
    await payload.create({
      collection: "users",
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, title: "Dev Admin" },
    });
    payload.logger.info(`Created admin user ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    payload.logger.info(`Admin user ${ADMIN_EMAIL} already exists — left untouched`);
  }

  // --- Header global (upsert) ----------------------------------------------------------------
  await payload.updateGlobal({ slug: "header", data: { name: "Dev Site" } });

  // --- Pages (wipe + recreate) ---------------------------------------------------------------
  await wipe("pages");
  const pages = [
    {
      title: "Home",
      slug: "home",
      seoTitle: "Home — Dev Site",
      metaDescription: "The landing page of the dev sandbox.",
      sections: [
        heroBlock(
          "Welcome to the Dev Site",
          "A sandbox for exercising the Payload plugins.",
          "Get started"
        ),
        contentBlock(
          doc(
            heading("h2", "Welcome aboard"),
            para(
              txt("This content section is a "),
              txt("localized", BOLD),
              txt(" rich-text block. Switch locale and translate it with the "),
              txt("field control", ITALIC),
              txt(".")
            ),
            heading("h3", "What you can do here"),
            list(
              "bullet",
              "Edit blocks inline in the admin",
              "Translate any field from the en source",
              "Preview the page live"
            ),
            para(
              txt("Read more in the "),
              link("Payload docs", "https://payloadcms.com/docs"),
              txt(".")
            ),
            quote(
              "Rich text seeds make the editor feel real — headings, lists, links and emphasis."
            )
          )
        ),
      ],
    },
    {
      title: "About",
      slug: "about",
      seoTitle: "About — Dev Site",
      metaDescription: "About the dev sandbox.",
      sections: [
        heroBlock("About us", "Who we are and what this sandbox is for.", "Learn more"),
        contentBlock(
          doc(
            heading("h2", "About this sandbox"),
            para(
              txt(
                "The about page demonstrates a second document with the same block structure but "
              ),
              txt("different", ITALIC),
              txt(" rich content.")
            ),
            heading("h3", "Numbered steps"),
            list(
              "number",
              "Create a document",
              "Fill the fields in en",
              "Switch locale and translate"
            ),
            quote("Every block is shared across locales; only the leaf values differ per locale.")
          )
        ),
      ],
    },
  ];
  const pageIds: Record<string, number> = {};
  for (const data of pages) {
    const created = await payload.create({ collection: "pages", locale: "en", data });
    pageIds[data.slug] = created.id;
    payload.logger.info(`Seeded page "${data.title}" id=${created.id}`);
  }

  // --- Articles (wipe + recreate) ------------------------------------------------------------
  await wipe("articles");
  const articles = [
    {
      title: "First article",
      content: doc(
        heading("h2", "Introduction"),
        para(
          txt("This is the top-level rich-text body of the first article. It mixes "),
          txt("bold", BOLD),
          txt(" and "),
          txt("italic", ITALIC),
          txt(" text, plus a "),
          link("link", "https://payloadcms.com"),
          txt(".")
        ),
        heading("h3", "Key points"),
        list("bullet", "Headings at two levels", "An unordered list", "Inline emphasis and links"),
        heading("h2", "Why it matters"),
        para(
          txt(
            "Use the per-field translate control to translate all of this from en into de, fr or es."
          )
        ),
        quote("A good seed exercises every node the editor can produce.")
      ),
    },
    {
      // Every sentence here is one German forces out of English order: the participle or the
      // infinitive lands at the end of the clause, and negation moves behind the object. The
      // formatting and the links sit on exactly those travelling words, so a translation that
      // keeps each piece in its source slot produces visibly broken German — which is what
      // separates translating a container as one string from translating node by node.
      title: "Word order",
      content: doc(
        heading("h2", "Why word order ", txt("matters", BOLD)),
        para(
          txt("The team has "),
          txt("published", BOLD),
          txt(" the "),
          txt("new documentation", ITALIC),
          txt(".")
        ),
        para(
          txt("We can "),
          txt("send", BOLD),
          txt(" you the "),
          link("full report", "https://payloadcms.com"),
          txt(" tomorrow.")
        ),
        para(
          txt("She did "),
          txt("not", BOLD),
          txt(" read the "),
          txt("manual", ITALIC),
          txt(" before she started.")
        ),
        para(
          txt("If you "),
          txt("register", BOLD),
          txt(" today, you will receive the "),
          txt("early access", ITALIC),
          txt(".")
        ),
        para(
          txt("An editor must be able to "),
          txt("reorder", BOLD),
          txt(" the "),
          link("inline links", "https://payloadcms.com/docs"),
          txt(" freely.")
        ),
        list(
          "bullet",
          li(
            txt("You have "),
            txt("already", BOLD),
            txt(" translated this "),
            txt("page", ITALIC),
            txt(".")
          ),
          li(
            txt("We will "),
            txt("not", BOLD),
            txt(" publish it "),
            txt("today", ITALIC),
            txt(".")
          ),
          li(
            txt("The reviewer has "),
            txt("approved", BOLD),
            txt(" every "),
            link("open change", "https://payloadcms.com"),
            txt(".")
          )
        ),
        quote(
          txt("Nobody can "),
          txt("guarantee", BOLD),
          txt(" that the "),
          txt("source order", ITALIC),
          txt(" survives a translation.")
        )
      ),
    },
    {
      title: "Second article",
      content: doc(
        heading("h2", "A shorter piece"),
        para(txt("Another article so the list view has more than one row.")),
        list("number", "First step", "Second step", "Third step")
      ),
    },
  ];
  const articleIds: Record<string, number> = {};
  for (const data of articles) {
    const created = await payload.create({ collection: "articles", locale: "en", data });
    articleIds[data.title] = created.id;
    payload.logger.info(`Seeded article "${data.title}" id=${created.id}`);
  }

  // --- Playground (wipe + recreate) — deep-nest sample at EVERY nesting depth -----------------
  await wipe("playground");
  const playground = await payload.create({
    collection: "playground",
    locale: "en",
    data: {
      title: "Deep nest sample (en)",
      layout: [
        {
          blockType: "deepNest",
          // group → collapsible → row (heading/subheading) + richText (intro)
          panel: {
            heading: "Panel heading (en)",
            subheading: "Panel subheading, a textarea inside group → collapsible → row (en).",
            intro: doc(
              heading("h3", "Panel intro (en)"),
              para(
                txt("Group → collapsible rich text with "),
                txt("bold", BOLD),
                txt(", "),
                txt("italic", ITALIC),
                txt(" and a "),
                link("link", "https://payloadcms.com"),
                txt(" (en).")
              ),
              list(
                "bullet",
                "First intro point (en)",
                list("bullet", "Nested bullet A (en)", "Nested bullet B (en)"),
                "Second intro point (en)"
              ),
              list("number", "Ordered one (en)", "Ordered two (en)")
            ),
          },
          // named tab
          meta: {
            seoTitle: "SEO title from the named Meta tab (en)",
            seoDescription: "SEO description textarea from the named Meta tab (en).",
          },
          // unnamed (transparent) tab
          body: doc(
            heading("h2", "Body heading (en)"),
            para(
              txt("Unnamed-tab rich text, transparent in the path. Inline "),
              txt("code", CODE),
              txt(" and "),
              txt("underline", UNDERLINE),
              txt(" (en).")
            ),
            heading("h3", "A subsection (en)"),
            quote(txt("A blockquote with "), txt("emphasis", ITALIC), txt(" inside (en).")),
            list(
              "number",
              "Step one (en)",
              li(txt("Step two with a "), link("link", "https://payloadcms.com"), txt(" (en)"))
            )
          ),
          // array, with a collapsible inside each row wrapping the richText
          items: [
            {
              label: "Item one label (en)",
              richBody: doc(
                heading("h3", "Item one body (en)"),
                para(txt("Array → collapsible rich text (en).")),
                list(
                  "bullet",
                  "Point A (en)",
                  list("bullet", "Sub-point A1 (en)", "Sub-point A2 (en)"),
                  "Point B (en)"
                )
              ),
            },
            {
              label: "Item two label (en)",
              richBody: doc(
                para(
                  txt("Item two body with "),
                  txt("bold", BOLD),
                  txt(" and "),
                  txt("italic", ITALIC),
                  txt(" (en).")
                ),
                quote("A short quote in item two (en).")
              ),
            },
          ],
          // nested blocks (block-in-block) → and leaves (block→block→block)
          nested: [
            {
              blockType: "inner",
              innerText: "Inner text — one block deep (en)",
              innerNote: "Inner note textarea — one block deep (en).",
              innerRich: doc(
                heading("h3", "Inner rich (en)"),
                para(
                  txt("Block-in-block rich text (en) with a "),
                  link("link", "https://payloadcms.com"),
                  txt(".")
                ),
                list("number", "Inner step one (en)", "Inner step two (en)")
              ),
              leaves: [
                {
                  blockType: "leaf",
                  deepText: "Deep text — three blocks deep (en)",
                  // The hardest data-aware case: structurally complex rich text three blocks deep —
                  // headings, mixed inline formatting, a nested list with a link, and a blockquote.
                  deepRich: doc(
                    heading("h2", "Deep heading (en)"),
                    para(
                      txt("Three blocks deep: "),
                      txt("bold", BOLD),
                      txt(", "),
                      txt("italic", ITALIC),
                      txt(", "),
                      txt("code", CODE),
                      txt(" (en).")
                    ),
                    heading("h3", "Nested list (en)"),
                    list(
                      "bullet",
                      "Deep bullet one (en)",
                      list("bullet", "Deep nested A (en)", "Deep nested B (en)"),
                      li(
                        txt("Deep bullet with "),
                        link("a link", "https://payloadcms.com"),
                        txt(" (en)")
                      )
                    ),
                    quote(txt("A deep blockquote with "), txt("emphasis", ITALIC), txt(" (en).")),
                    para(txt("Closing paragraph at the deepest path (en)."))
                  ),
                },
              ],
            },
          ],
        },
      ],
    },
  });
  payload.logger.info(`Seeded playground doc id=${playground.id} (locale=en)`);

  await seedRelations(payload, { articleIds, pageIds, playgroundId: playground.id });

  payload.logger.info("Seed complete.");
};

try {
  await run();
  process.exit(0);
} catch (error) {
  // biome-ignore lint/suspicious/noConsole: standalone script — payload logger may be unavailable on failure
  console.error(error);
  process.exit(1);
}
