/**
 * Page recipes (plan §6.8): each IA page becomes a list of blocks built from its dump sections.
 * Recipes degrade gracefully — a page without a dump source (or a thin one) still gets a hero, a
 * meaningful middle and the global CTA, so every §7 URL renders.
 */
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

import { markdownToLexical } from "@/lib/markdown/toLexical";

import type { SeedContext } from "./context";
import { CASE_STUDY_ITEMS } from "./caseStudies";
import { brandTitle, IA } from "./data/ia";
import type { IaPage } from "./data/ia";
import type { SeedLink } from "./links";
import { pageLink } from "./links";
import { firstSentence, listItems, paragraphs, sectionMarkdown } from "./sections";
import type { PageSections, Section } from "./sections";

type Block = Record<string, unknown> & { blockType: string };
type Theme = "light" | "dark" | "light-gray" | "dark-gray";

export interface RecipeInput {
  ctx: SeedContext;
  page: IaPage;
  title: string;
  sections: PageSections;
  hasDownloadForm: boolean;
  /** Number of download forms the dump showed (TSF has two). */
  downloadForms: number;
  coverId: number | null;
  ctaBlockId: number | null;
}

const section = (theme: Theme) => ({ section: { theme } });

async function rich(ctx: SeedContext, markdown: string): Promise<SerializedEditorState | null> {
  return markdown.trim() ? markdownToLexical(markdown, ctx.payload.config) : null;
}

function action(link: SeedLink, appearance: "default" | "outline" | "accent" | "ghost") {
  return { ...link, appearance };
}

async function hero(
  input: RecipeInput,
  opts: {
    theme: Theme;
    variant?: "centered" | "showcase";
    eyebrow?: string;
    title?: string;
    lead?: string;
    actions?: ReturnType<typeof action>[];
    image?: number | null;
  }
): Promise<Block> {
  return {
    actions: opts.actions ?? [],
    blockType: "hero",
    eyebrow: opts.eyebrow,
    image: { image: opts.image ?? null },
    richText: opts.lead ? await rich(input.ctx, opts.lead) : null,
    title: opts.title ?? input.title,
    variant: opts.variant ?? "centered",
    ...section(opts.theme),
  };
}

async function content(
  input: RecipeInput,
  sec: Section,
  theme: Theme,
  image: number | null = null
): Promise<Block | null> {
  const body = await rich(input.ctx, sectionMarkdown(sec));
  if (!body) {
    return null;
  }
  return {
    blockType: "content",
    content: body,
    heading: sec.heading,
    image,
    layout: "text-image",
    ...section(theme),
  };
}

/** Content blocks for every section, alternating white / sand. */
async function contentGroups(
  input: RecipeInput,
  sections: Section[],
  startTheme: Theme = "light"
): Promise<Block[]> {
  const blocks: Block[] = [];
  let sand = startTheme === "light-gray";
  for (const sec of sections) {
    const block = await content(input, sec, sand ? "light-gray" : "light");
    if (block) {
      blocks.push(block);
      sand = !sand;
    }
  }
  return blocks;
}

function cardsGrid(opts: {
  heading?: string;
  eyebrow?: string;
  columns?: number;
  numbered?: boolean;
  theme?: Theme;
  items: { title: string; description?: string; icon?: string; link?: SeedLink }[];
}): Block {
  return {
    blockType: "cardsGrid",
    columns: opts.columns ?? 3,
    eyebrow: opts.eyebrow,
    heading: opts.heading,
    items: opts.items.map((item) => ({
      alignVariant: "left",
      backgroundColor: opts.theme === "light-gray" ? "light" : "light-gray",
      description: item.description,
      icon: item.icon,
      image: { image: null },
      link: item.link
        ? { ...item.link, appearance: "link" }
        : { type: "custom", url: "", label: "" },
      rounded: "large",
      title: item.title,
    })),
    numbered: opts.numbered ?? false,
    ...section(opts.theme ?? "light"),
  };
}

async function childCards(
  input: RecipeInput,
  parent: string,
  heading: string,
  numbered = true
): Promise<Block | null> {
  const children = IA.filter((page) => page.parent === parent);
  if (children.length === 0) {
    return null;
  }
  const company = input.ctx.site.companyName;
  return cardsGrid({
    heading,
    items: await Promise.all(
      children.map(async (child) => ({
        description: child.summary,
        link: await pageLink(input.ctx, child.path, "Learn more"),
        title: brandTitle(child.title, company),
      }))
    ),
    numbered,
  });
}

function postsList(
  opts: {
    heading: string;
    eyebrow?: string;
    category?: string;
    layout?: "grid" | "list" | "featured";
    limit?: number;
    theme?: Theme;
    viewAll?: SeedLink;
  },
  categoryId?: number
): Block {
  return {
    blockType: "postsList",
    category: categoryId,
    eyebrow: opts.eyebrow,
    heading: opts.heading,
    layout: opts.layout ?? "grid",
    limit: opts.limit ?? 3,
    source: categoryId ? "category" : "latest",
    viewAll: opts.viewAll ?? { type: "custom", url: "", label: "" },
    ...section(opts.theme ?? "light"),
  };
}

function relatedPosts(
  input: RecipeInput,
  heading: string,
  layout: "grid" | "list" = "grid",
  limit = 3
): Block {
  const categoryId = input.page.category
    ? input.ctx.ids.categories.get(input.page.category)
    : undefined;
  return postsList({ heading, layout, limit }, categoryId);
}

function newsletter(theme: Theme = "light"): Block {
  return {
    blockType: "newsletter",
    buttonLabel: "Subscribe",
    disclaimer: "One email a month. Unsubscribe anytime.",
    eyebrow: "Newsletter",
    heading: "News from the engineers, once a month",
    inputPlaceholder: "you@company.com",
    ...section(theme),
  };
}

function form(opts: {
  heading: string;
  description?: string;
  formName: string;
  fields: {
    name: string;
    label: string;
    type: string;
    required?: boolean;
    width?: "full" | "half";
    options?: string;
  }[];
  submitLabel?: string;
  successMessage?: string;
  successLink?: SeedLink;
  theme?: Theme;
}): Block {
  return {
    blockType: "form",
    description: opts.description,
    fields: opts.fields,
    formName: opts.formName,
    heading: opts.heading,
    mode: "internal",
    submitLabel: opts.submitLabel ?? "Submit",
    successLink: opts.successLink ?? { type: "custom", url: "", label: "" },
    successMessage: opts.successMessage ?? "Thank you — we will be in touch shortly.",
    ...section(opts.theme ?? "light-gray"),
  };
}

export const GATED_FIELDS = [
  { label: "Work email", name: "email", required: true, type: "email", width: "half" as const },
  { label: "Company", name: "company", required: true, type: "text", width: "half" as const },
  { label: "I agree to the privacy policy", name: "consent", required: true, type: "checkbox" },
];

function gatedForm(
  input: RecipeInput,
  heading: string,
  formName: string,
  reportPath = "/resources/reports"
): Promise<Block> {
  return pageLink(input.ctx, reportPath, "Download the sample report").then((link) =>
    form({
      description: "Leave your details and the download link appears straight away.",
      fields: GATED_FIELDS,
      formName,
      heading,
      submitLabel: "Get the download",
      successLink: link,
      successMessage: "Thank you — your download is ready.",
    })
  );
}

function ctaSlot(input: RecipeInput): Block[] {
  return input.ctaBlockId ? [{ blockType: "globalSectionSlot", reference: input.ctaBlockId }] : [];
}

function lead(input: RecipeInput): string {
  return (
    paragraphs(input.sections.intro)[0] ??
    paragraphs(input.sections.sections[0]?.body ?? "")[0] ??
    ""
  );
}

/** Sections whose sub-headings are questions become an FAQ. */
function faqFrom(sections: Section[]): { faq: Section | null; rest: Section[] } {
  const faq = sections.find(
    (sec) =>
      sec.subsections.length > 0 && sec.subsections.every((sub) => sub.heading.trim().endsWith("?"))
  );
  const questionsSection = faq ?? null;
  const loose = sections.flatMap((sec) =>
    sec.subsections.filter((sub) => sub.heading.trim().endsWith("?"))
  );
  if (!questionsSection && loose.length > 0) {
    return {
      faq: { body: "", heading: "Frequently asked questions", subsections: loose },
      rest: sections.map((sec) => ({
        ...sec,
        subsections: sec.subsections.filter((sub) => !sub.heading.trim().endsWith("?")),
      })),
    };
  }
  return { faq: questionsSection, rest: sections.filter((sec) => sec !== questionsSection) };
}

async function faqBlock(input: RecipeInput, faq: Section): Promise<Block> {
  return {
    blockType: "faq",
    heading: faq.heading,
    items: await Promise.all(
      faq.subsections.map(async (sub) => ({
        answer: await rich(input.ctx, sub.body || "—"),
        question: sub.heading,
      }))
    ),
    ...section("light"),
  };
}

// ───────────────────────────── recipes ─────────────────────────────

const HOME_LOGOS = [
  "Eclipse Foundation",
  "RISC-V International",
  "AGL",
  "ELISA",
  "OSADL",
  "MIT STPA",
  "NVIDIA Partner Network",
  "Red Hat",
  "SUSE",
  "Microchip",
  "CIP",
  "Bazel",
];

async function home(input: RecipeInput): Promise<Block[]> {
  const { ctx, sections } = input;
  const philosophySource = sections.sections.find((sec) => sec.subsections.length >= 3) ?? null;
  const philosophyItems = (philosophySource?.subsections ?? sections.sections).slice(0, 4);
  const icons = ["shield", "compass", "git-branch", "gauge"];
  const systems = sections.sections.find((sec) => sec !== philosophySource) ?? null;

  return [
    await hero(input, {
      actions: [
        action(await pageLink(ctx, "/contact", "Talk to an engineer"), "accent"),
        action(await pageLink(ctx, "/what-we-do", "What we do"), "outline"),
      ],
      eyebrow: "Open source system software experts · since 2007",
      lead: lead(input),
      theme: "dark",
      title: "Software you can trust, built in the open.",
    }),
    {
      blockType: "stats",
      items: [
        { label: "Founded", value: "2007" },
        { label: "Engineers", value: "100+" },
        { label: "Certified quality & security", value: "ISO 9001 & 27001" },
        { label: "Safety baseline", value: "SIL 3 / ASIL D" },
      ],
      ...section("light"),
    },
    ...(philosophyItems.length > 0
      ? [
          cardsGrid({
            columns: 4,
            heading: philosophySource?.heading ?? "Our philosophy",
            items: philosophyItems.map((item, index) => ({
              description: firstSentence("body" in item ? item.body : ""),
              icon: icons[index],
              title: item.heading,
            })),
          }),
        ]
      : []),
    ...(systems
      ? [await content(input, systems, "light-gray", input.coverId)].filter(
          (block): block is Block => block !== null
        )
      : []),
    ...[await childCards(input, "/what-we-do", "What we do")].filter(
      (block): block is Block => block !== null
    ),
    ...[await childCards(input, "/sectors", "Sectors", false)]
      .filter((block): block is Block => block !== null)
      .map((block) => ({ ...block, ...section("light-gray") })),
    {
      alignVariant: "center",
      blockType: "logos",
      items: HOME_LOGOS.map((name) => ({
        image: { image: null },
        link: { label: name, type: "custom", url: "#" },
      })),
      label: "Communities and partners",
      ...section("light-gray"),
    },
    postsList({
      eyebrow: "Blog",
      heading: `Latest from ${ctx.site.companyName ?? "CT"}`,
      layout: "featured",
      limit: 3,
      viewAll: await pageLink(ctx, "/blog", "All articles"),
    }),
    newsletter("light"),
    ...ctaSlot(input),
  ];
}

const TECHNOLOGY_PROJECTS = [
  ["Trustable Software Framework", "Evidence-based approach to software you can trust."],
  ["RE:OS / CTRL OS", "Trustable, reproducible Linux for critical systems."],
  ["SIF", "Safety integrity framework tooling."],
  ["freedesktop-sdk", "Minimal, reproducible runtime used by Flatpak."],
  ["BuildStream", "Integration tool for building software stacks."],
  ["RAFIA", "Risk analysis for automotive integration."],
  ["rusty-worker", "Remote execution worker written in Rust."],
  ["Safety Monitor", "Runtime monitoring for safety-relevant systems."],
] as const;

async function hub(input: RecipeInput): Promise<Block[]> {
  const blocks: Block[] = [
    await hero(input, { lead: lead(input), theme: "light" }),
    ...[
      await childCards(
        input,
        input.page.path,
        input.page.path === "/resources" ? "Resources" : "Explore"
      ),
    ].filter((b): b is Block => b !== null),
  ];
  if (input.page.path === "/technology") {
    blocks.push(
      cardsGrid({
        heading: "Open source projects we maintain",
        items: TECHNOLOGY_PROJECTS.map(([title, description]) => ({ description, title })),
        theme: "light-gray",
      })
    );
  }
  blocks.push(relatedPosts(input, "Latest articles"), ...ctaSlot(input));
  return blocks;
}

async function service(input: RecipeInput): Promise<Block[]> {
  const { sections } = input;
  const projects = sections.sections.find((sec) => sec.subsections.length >= 3);
  const groups = sections.sections.filter((sec) => sec !== projects);
  const siblings = IA.filter(
    (page) => page.parent === input.page.parent && page.path !== input.page.path
  );
  return [
    await hero(input, {
      eyebrow: "What we do",
      image: input.coverId,
      lead: lead(input),
      theme: "light",
      variant: "showcase",
    }),
    ...(await contentGroups(input, groups)),
    ...(projects
      ? [
          cardsGrid({
            heading: projects.heading || "Example projects",
            items: projects.subsections.map((sub) => ({
              description: firstSentence(sub.body, 200),
              title: sub.heading,
            })),
            numbered: true,
          }),
        ]
      : []),
    relatedPosts(input, "From the blog", "list", 4),
    cardsGrid({
      heading: "Other services",
      items: await Promise.all(
        siblings.map(async (page) => ({
          link: await pageLink(input.ctx, page.path, "Learn more"),
          title: page.title,
        }))
      ),
      theme: "light-gray",
    }),
    ...ctaSlot(input),
  ];
}

async function sector(input: RecipeInput): Promise<Block[]> {
  const { faq, rest } = faqFrom(input.sections.sections);
  const caseStudies = CASE_STUDY_ITEMS(input.ctx);
  return [
    await hero(input, { eyebrow: "Sectors", lead: lead(input), theme: "dark" }),
    ...(await contentGroups(input, rest)),
    ...(caseStudies.some((item) => item.sector === input.page.sector)
      ? [
          {
            blockType: "caseStudies",
            filterSector: input.page.sector,
            heading: "Case studies",
            items: caseStudies,
            ...section("light-gray"),
          },
        ]
      : []),
    ...(faq ? [await faqBlock(input, faq)] : []),
    relatedPosts(input, "Related articles"),
    ...ctaSlot(input),
  ];
}

async function solution(input: RecipeInput): Promise<Block[]> {
  const eyebrow = input.page.slug === "ctrl-os" ? "CTRL OS · becoming RE:OS" : "Technology";
  const forms: Block[] = [];
  for (let index = 0; index < input.downloadForms; index++) {
    forms.push(
      await gatedForm(
        input,
        index === 0 ? "Download the assessment" : "Download the white paper",
        `download-${input.page.slug}${index === 0 ? "" : `-${index + 1}`}`
      )
    );
  }
  return [
    await hero(input, { eyebrow, lead: lead(input), theme: "dark" }),
    ...(await contentGroups(input, input.sections.sections)),
    ...forms,
    relatedPosts(input, "Trustable & Safety articles"),
    ...ctaSlot(input),
  ];
}

async function about(input: RecipeInput): Promise<Block[]> {
  const blocks: Block[] = [await hero(input, { lead: lead(input), theme: "light" })];
  let sand = false;
  for (const sec of input.sections.sections) {
    const items = listItems(sec.body);
    const theme: Theme = sand ? "light-gray" : "light";
    if (
      input.page.slug !== "environmental-policy" &&
      (sec.subsections.length >= 3 || items.length >= 4)
    ) {
      blocks.push(
        cardsGrid({
          heading: sec.heading,
          items:
            sec.subsections.length >= 3
              ? sec.subsections.map((sub) => ({
                  description: firstSentence(sub.body, 200),
                  title: sub.heading,
                }))
              : items.map((item) => ({ title: firstSentence(item, 120) })),
          numbered: true,
          theme,
        })
      );
    } else {
      const block = await content(input, sec, theme);
      if (block) {
        blocks.push(block);
      }
    }
    sand = !sand;
  }
  return [...blocks, ...ctaSlot(input)];
}

async function careers(input: RecipeInput): Promise<Block[]> {
  return [
    await hero(input, { eyebrow: "Careers", lead: lead(input), theme: "light" }),
    ...(await contentGroups(input, input.sections.sections.slice(0, 1))),
    ...[await childCards(input, "/who-we-are/careers", "Open roles", false)].filter(
      (b): b is Block => b !== null
    ),
    ...(await contentGroups(input, input.sections.sections.slice(1), "light-gray")),
    ...ctaSlot(input),
  ];
}

async function jobDescription(input: RecipeInput): Promise<Block[]> {
  return [
    await hero(input, { eyebrow: "Careers · on-site / remote", theme: "light" }),
    ...(await contentGroups(
      input,
      input.sections.intro
        ? [
            { body: input.sections.intro, heading: "The role", subsections: [] },
            ...input.sections.sections,
          ]
        : input.sections.sections
    )),
    form({
      fields: [
        { label: "Name", name: "name", required: true, type: "text", width: "half" },
        { label: "Email", name: "email", required: true, type: "email", width: "half" },
        { label: "LinkedIn profile", name: "linkedin", type: "text" },
        { label: "Why this role?", name: "message", required: true, type: "textarea" },
        {
          label: "I agree to the privacy policy",
          name: "consent",
          required: true,
          type: "checkbox",
        },
      ],
      formName: `apply-${input.page.slug}`,
      heading: "Apply",
      submitLabel: "Send application",
    }),
    ...ctaSlot(input),
  ];
}

async function listing(input: RecipeInput): Promise<Block[]> {
  return [
    await hero(input, { lead: lead(input), theme: "light" }),
    relatedPosts(input, "All announcements", "list", 12),
    newsletter("light-gray"),
    ...ctaSlot(input),
  ];
}

async function caseStudiesPage(input: RecipeInput): Promise<Block[]> {
  const items = CASE_STUDY_ITEMS(input.ctx);
  return [
    await hero(input, { lead: lead(input), theme: "light" }),
    ...(items.length > 0
      ? [
          {
            blockType: "caseStudies",
            filterSector: "all",
            heading: "Selected projects",
            items,
            ...section("light-gray"),
          },
        ]
      : await contentGroups(input, input.sections.sections)),
    ...ctaSlot(input),
  ];
}

async function reports(input: RecipeInput): Promise<Block[]> {
  const blocks: Block[] = [await hero(input, { lead: lead(input), theme: "light" })];
  let sand = false;
  for (const sec of input.sections.sections) {
    const block = await content(input, sec, sand ? "light-gray" : "light", input.coverId);
    if (block) {
      blocks.push(block);
      sand = !sand;
    }
  }
  blocks.push(await gatedForm(input, "Download a report", "download-reports"), ...ctaSlot(input));
  return blocks;
}

async function events(input: RecipeInput): Promise<Block[]> {
  const [upcoming, ...past] = input.sections.sections;
  const talks = input.sections.sections
    .flatMap((sec) => sec.subsections.map((sub) => sub.heading))
    .slice(0, 3);
  const videoTitles =
    talks.length >= 3
      ? talks
      : [
          "Trustable software in practice",
          "Reproducible builds at scale",
          "Safety and open source",
        ];
  return [
    await hero(input, { eyebrow: "Events", lead: lead(input), theme: "dark-gray" }),
    ...(upcoming ? await contentGroups(input, [upcoming]) : []),
    ...videoTitles.map((title, index) => ({
      blockType: "videoEmbed",
      heading: index === 0 ? "Watch the talks" : undefined,
      provider: "youtube",
      title,
      ...section("light"),
    })),
    ...(await contentGroups(input, past.slice(0, 4), "light-gray")),
    newsletter("light"),
    ...ctaSlot(input),
  ];
}

async function campaign(input: RecipeInput): Promise<Block[]> {
  const questions = input.sections.sections
    .flatMap((sec) => sec.subsections)
    .filter((sub) => sub.heading.trim().endsWith("?"));
  const groups = input.sections.sections.map((sec) => ({
    ...sec,
    subsections: sec.subsections.filter((sub) => !questions.includes(sub)),
  }));
  return [
    await hero(input, { eyebrow: "CES 2026 · Las Vegas", lead: lead(input), theme: "dark" }),
    ...(await contentGroups(input, groups)),
    ...(questions.length > 0
      ? [
          cardsGrid({
            heading: `How can ${input.ctx.site.companyName ?? "CT"} help?`,
            items: questions.map((q) => ({
              description: firstSentence(q.body, 200),
              title: q.heading,
            })),
            theme: "light-gray",
          }),
        ]
      : []),
    form({
      fields: [
        { label: "Name", name: "name", required: true, type: "text", width: "half" },
        { label: "Email", name: "email", required: true, type: "email", width: "half" },
        { label: "Company", name: "company", type: "text", width: "half" },
        {
          label: "Preferred day",
          name: "day",
          options: "Tuesday, Wednesday, Thursday, Friday",
          type: "select",
          width: "half",
        },
        { label: "What would you like to discuss?", name: "message", type: "textarea" },
      ],
      formName: "book-a-meeting-ces",
      heading: "Book a meeting",
      submitLabel: "Request a meeting",
    }),
    ...ctaSlot(input),
  ];
}

async function contact(input: RecipeInput): Promise<Block[]> {
  const { chrome } = input.ctx.site;
  const details = [
    chrome.phones.length > 0 ? `**Phone:** ${chrome.phones.join(" · ")}` : "",
    chrome.emails.length > 0
      ? `**Email:** ${chrome.emails.map((email) => `[${email}](mailto:${email})`).join(" · ")}`
      : "",
    input.sections.intro,
  ]
    .filter(Boolean)
    .join("\n\n");
  return [
    await hero(input, { theme: "light" }),
    ...[
      await content(input, { body: details, heading: "Contact details", subsections: [] }, "light"),
    ].filter((b): b is Block => b !== null),
    ...(await contentGroups(input, input.sections.sections, "light-gray")),
    cardsGrid({
      heading: "Talk to the right team",
      items: [
        {
          description: "Open roles, internships and the way we work.",
          icon: "users",
          link: await pageLink(input.ctx, "/who-we-are/careers", "Careers"),
          title: "Careers",
        },
        {
          description: "Invoices, supplier questions and administration.",
          icon: "file-text",
          title: "Finance & Admin",
        },
        {
          description: "Projects, partnerships and consulting enquiries.",
          icon: "target",
          title: "Sales",
        },
      ],
    }),
    form({
      fields: [
        { label: "Name", name: "name", required: true, type: "text", width: "half" },
        { label: "Email", name: "email", required: true, type: "email", width: "half" },
        { label: "Company", name: "company", type: "text", width: "half" },
        {
          label: "Topic",
          name: "topic",
          options: "A project, Careers, Press, Something else",
          type: "select",
          width: "half",
        },
        { label: "Message", name: "message", required: true, type: "textarea" },
        {
          label: "I agree to the privacy policy",
          name: "consent",
          required: true,
          type: "checkbox",
        },
      ],
      formName: "contact",
      heading: "Send an enquiry",
      submitLabel: "Send",
    }),
  ];
}

async function legal(input: RecipeInput): Promise<Block[]> {
  const body = [
    input.sections.intro,
    ...input.sections.sections.map((sec) => `## ${sec.heading}\n\n${sectionMarkdown(sec)}`),
  ]
    .filter(Boolean)
    .join("\n\n");
  return [
    await hero(input, { theme: "light" }),
    ...[await content(input, { body, heading: "", subsections: [] }, "light")].filter(
      (b): b is Block => b !== null
    ),
    ...ctaSlot(input),
  ];
}

export const RECIPES: Record<IaPage["recipe"], (input: RecipeInput) => Promise<Block[]>> = {
  ABOUT: about,
  CAMPAIGN: campaign,
  CAREERS: careers,
  CASE_STUDIES: caseStudiesPage,
  CONTACT: contact,
  EVENTS: events,
  HOME: home,
  HUB: hub,
  JD: jobDescription,
  LEGAL: legal,
  LISTING: listing,
  REPORTS: reports,
  SECTOR: sector,
  SERVICE: service,
  SOLUTION: solution,
};
