import { markdownToLexical } from "@/lib/markdown/toLexical";

import { CASE_STUDY_ITEMS } from "./caseStudies";
import { emptyResult } from "./context";
import type { SeedStep } from "./context";
import { pageLink } from "./links";
import { DEMO_MAUTIC_FORM_ID, GATED_FIELDS } from "./recipes";

/**
 * Presets that make "no developer per page" concrete (plan §5.1). The presets plugin stores one
 * block per preset, so the plan's "Sector hero + case studies" is two presets.
 */
export const seedPresets: SeedStep = async (ctx) => {
  const result = emptyResult();
  const company = ctx.site.companyName ?? "CT";
  const lead = await markdownToLexical(
    "One paragraph that says what the page is about, in plain words.",
    ctx.payload.config
  );
  const caseStudies = CASE_STUDY_ITEMS(ctx);

  const presets: { name: string; block: Record<string, unknown> }[] = [
    {
      block: {
        actions: [
          { ...(await pageLink(ctx, "/contact", "Talk to an engineer")), appearance: "accent" },
        ],
        blockType: "hero",
        eyebrow: "What we do",
        image: { image: null },
        richText: lead,
        section: { theme: "dark" },
        title: "Service name",
        variant: "centered",
      },
      name: "Service hero (dark)",
    },
    {
      block: {
        actions: [],
        blockType: "hero",
        eyebrow: "Sectors",
        image: { image: null },
        richText: lead,
        section: { theme: "dark" },
        title: "Sector name",
        variant: "centered",
      },
      name: "Sector hero",
    },
    ...(caseStudies.length > 0
      ? [
          {
            block: {
              blockType: "caseStudies",
              filterSector: "automotive",
              heading: "Case studies",
              items: caseStudies,
              section: { theme: "light-gray" },
            },
            name: "Sector case studies",
          },
        ]
      : []),
    {
      block: {
        blockType: "form",
        description: "Leave your details and the download link appears straight away.",
        fields: GATED_FIELDS,
        heading: "Download the white paper",
        mauticFormId: DEMO_MAUTIC_FORM_ID,
        mauticFormName: "whitepaper",
        section: { theme: "light-gray" },
        submitLabel: "Get the download",
        successLink: await pageLink(ctx, "/resources/reports", "Download the sample report"),
        successMessage: "Thank you — your download is ready.",
      },
      name: "Gated whitepaper form",
    },
    {
      block: {
        blockType: "newsletter",
        buttonLabel: "Subscribe",
        disclaimer: "One email a month. Unsubscribe anytime.",
        eyebrow: "Newsletter",
        heading: "News from the engineers, once a month",
        inputPlaceholder: "you@company.com",
        section: { theme: "light" },
      },
      name: "Newsletter band",
    },
    {
      block: {
        blockType: "form",
        fields: [
          { label: "Name", name: "name", required: true, type: "text", width: "half" },
          { label: "Email", name: "email", required: true, type: "email", width: "half" },
          { label: "Message", name: "message", required: true, type: "textarea" },
          {
            label: "I agree to the privacy policy",
            name: "consent",
            required: true,
            type: "checkbox",
          },
        ],
        heading: "Send an enquiry",
        mauticFormId: DEMO_MAUTIC_FORM_ID,
        mauticFormName: "contact",
        section: { theme: "light" },
        submitLabel: "Send",
      },
      name: "Contact enquiry form",
    },
    {
      block: {
        blockType: "postsList",
        eyebrow: "Blog",
        heading: `Latest from ${company}`,
        layout: "grid",
        limit: 3,
        section: { theme: "light" },
        source: "latest",
        viewAll: await pageLink(ctx, "/blog", "All articles"),
      },
      name: "Latest news (3)",
    },
  ];

  for (const preset of presets) {
    const found = await ctx.payload.find({
      collection: "presets",
      limit: 1,
      where: { name: { equals: preset.name } },
    });
    const data = { name: preset.name, presetBlock: [preset.block] } as never;
    if (found.docs[0]) {
      result.skipped++;
      continue;
    }
    await ctx.payload.create({ collection: "presets", context: ctx.writeContext, data });
    result.created++;
  }
  return result;
};
