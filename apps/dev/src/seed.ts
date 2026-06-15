import { getPayload } from "payload";

import config from "./payload.config";

// Seeds the dev SQLite DB with content in the `en` source locale only, so the translator
// plugin has saved sources to translate FROM (de/fr/es stay empty on purpose). Run from apps/dev:
//   bun run seed
//
// Idempotent: the content collections (pages, articles, playground) are wiped and recreated on
// every run, the admin user is find-or-created (never duplicated), and the Header global is
// upserted. So you always end up with the same known dataset — safe to re-run after `rm dev.db`.

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "dev@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "dev123456";

// --- Lexical node builders (Payload default editor) ------------------------------------------
// Child nodes are typed loosely by Payload (root.children is `{ [k]: unknown; type; version }[]`),
// so only the root needs the narrow `as const` on direction/format — the rest is free-form.
type LexNode = { type: string; version: number; [k: string]: unknown };

// Inline text. `format` is a bitmask: bold=1, italic=2, underline=8, code=16.
const BOLD = 1;
const ITALIC = 2;
const txt = (text: string, format = 0): LexNode => ({ type: "text", detail: 0, format, mode: "normal", style: "", text, version: 1 });
const link = (text: string, url: string): LexNode => ({ type: "link", fields: { linkType: "custom", newTab: true, url }, children: [txt(text)], direction: "ltr", format: "", indent: 0, version: 3 });

// Block-level nodes.
const para = (...children: LexNode[]): LexNode => ({ type: "paragraph", children, direction: "ltr", format: "", indent: 0, textFormat: 0, version: 1 });
const heading = (tag: "h2" | "h3", text: string): LexNode => ({ type: "heading", tag, children: [txt(text)], direction: "ltr", format: "", indent: 0, version: 1 });
const quote = (text: string): LexNode => ({ type: "quote", children: [txt(text)], direction: "ltr", format: "", indent: 0, version: 1 });
const list = (listType: "bullet" | "number", ...items: string[]): LexNode => ({
  type: "list",
  listType,
  tag: listType === "bullet" ? "ul" : "ol",
  start: 1,
  children: items.map((text, i) => ({ type: "listitem", value: i + 1, children: [txt(text)], direction: "ltr", format: "", indent: 0, version: 1 })),
  direction: "ltr",
  format: "",
  indent: 0,
  version: 1,
});

// Root wrapper. Pass block-level nodes. The `as const` on the root is required — Payload types
// root.direction/format as unions, and a bare string literal widens to `string` otherwise.
const doc = (...children: LexNode[]) => ({
  root: { type: "root", children, direction: "ltr" as const, format: "" as const, indent: 0, version: 1 },
});

// Convenience: a doc of one-or-more plain paragraphs — for the deep-nest leaves where the point
// is the field path, not the formatting.
const richText = (...paragraphs: string[]) => doc(...paragraphs.map((p) => para(txt(p))));

// hero + content blocks both pass through withSectionVisibility, which only adds an optional
// hidden checkbox — no extra required data needed here.
const heroBlock = (title: string, description: string, ctaLabel: string) => ({
  blockType: "hero" as const,
  title,
  description,
  cta: [{ label: ctaLabel, url: "#" }],
});

const contentBlock = (content: ReturnType<typeof doc>) => ({ blockType: "content" as const, content });

const run = async () => {
  const payload = await getPayload({ config });
  const wipe = (collection: "pages" | "articles" | "playground") => payload.delete({ collection, where: { id: { exists: true } } });

  // --- Admin user (find-or-create; never duplicated) -----------------------------------------
  const existingUser = await payload.find({ collection: "users", where: { email: { equals: ADMIN_EMAIL } }, limit: 1 });
  if (existingUser.docs.length === 0) {
    await payload.create({ collection: "users", data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, title: "Dev Admin" } });
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
        heroBlock("Welcome to the Dev Site", "A sandbox for exercising the Payload plugins.", "Get started"),
        contentBlock(
          doc(
            heading("h2", "Welcome aboard"),
            para(txt("This content section is a "), txt("localized", BOLD), txt(" rich-text block. Switch locale and translate it with the "), txt("field control", ITALIC), txt(".")),
            heading("h3", "What you can do here"),
            list("bullet", "Edit blocks inline in the admin", "Translate any field from the en source", "Preview the page live"),
            para(txt("Read more in the "), link("Payload docs", "https://payloadcms.com/docs"), txt(".")),
            quote("Rich text seeds make the editor feel real — headings, lists, links and emphasis.")
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
            para(txt("The about page demonstrates a second document with the same block structure but "), txt("different", ITALIC), txt(" rich content.")),
            heading("h3", "Numbered steps"),
            list("number", "Create a document", "Fill the fields in en", "Switch locale and translate"),
            quote("Every block is shared across locales; only the leaf values differ per locale.")
          )
        ),
      ],
    },
  ];
  for (const data of pages) {
    const created = await payload.create({ collection: "pages", locale: "en", data });
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
        para(txt("Use the per-field translate control to translate all of this from en into de, fr or es.")),
        quote("A good seed exercises every node the editor can produce.")
      ),
    },
    {
      title: "Second article",
      content: doc(heading("h2", "A shorter piece"), para(txt("Another article so the list view has more than one row.")), list("number", "First step", "Second step", "Third step")),
    },
  ];
  for (const data of articles) {
    const created = await payload.create({ collection: "articles", locale: "en", data });
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
              para(txt("Rich text inside group → collapsible (en), now with a heading and a list.")),
              list("bullet", "First intro point (en)", "Second intro point (en)")
            ),
          },
          // named tab
          meta: {
            seoTitle: "SEO title from the named Meta tab (en)",
            seoDescription: "SEO description textarea from the named Meta tab (en).",
          },
          // unnamed (transparent) tab
          body: doc(heading("h2", "Body heading (en)"), para(txt("Body rich text — unnamed tab, transparent in the path (en).")), quote("A quote in the body tab (en).")),
          // array, with a collapsible inside each row wrapping the richText
          items: [
            { label: "Item one label (en)", richBody: richText("Item one rich body — array → collapsible (en).") },
            { label: "Item two label (en)", richBody: richText("Item two rich body — array → collapsible (en).") },
          ],
          // nested blocks (block-in-block) → and leaves (block→block→block)
          nested: [
            {
              blockType: "inner",
              innerText: "Inner text — one block deep (en)",
              innerNote: "Inner note textarea — one block deep (en).",
              innerRich: richText("Inner rich text — block-in-block (en)."),
              leaves: [
                {
                  blockType: "leaf",
                  deepText: "Deep text — three blocks deep (en)",
                  // inline formatting three blocks deep — the hardest data-aware resolution case.
                  deepRich: doc(para(txt("Deep rich text — "), txt("block → block → block", BOLD), txt(" (en)."))),
                },
              ],
            },
          ],
        },
      ],
    },
  });
  payload.logger.info(`Seeded playground doc id=${playground.id} (locale=en)`);

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
