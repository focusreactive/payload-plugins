import type { Block } from "payload";

// WealthBriefing Subscribe. Self-contained section (its ui/ renders its own
// <section>/container/background), so no injectSection/SectionContainer.
// Field names mirror the ui props 1:1 so the controller maps straight through.
export const WbSubscribeBlock: Block = {
  slug: "wbSubscribe",
  interfaceName: "WbSubscribeBlock",
  labels: { plural: "WB Subscribe Sections", singular: "WB Subscribe" },
  fields: [
    { name: "eyebrow", type: "text" },
    { name: "title", type: "text" },
    {
      name: "plans",
      type: "array",
      fields: [
        { name: "value", type: "text" },
        { name: "title", type: "text" },
        { name: "tagLabel", type: "text" },
        {
          name: "tagTone",
          type: "select",
          options: [
            { label: "Paid", value: "paid" },
            { label: "Free", value: "free" },
          ],
        },
        { name: "description", type: "textarea" },
        { name: "cta", type: "text" },
        { name: "note", type: "text" },
      ],
    },
    { name: "defaultPlanValue", type: "text" },
    { name: "detailsLabel", type: "text" },
    { name: "emailPlaceholder", type: "text" },
    { name: "firstNamePlaceholder", type: "text" },
    { name: "lastNamePlaceholder", type: "text" },
    { name: "companyPlaceholder", type: "text" },
    {
      name: "regions",
      type: "array",
      fields: [{ name: "region", type: "text" }],
    },
    { name: "defaultRegion", type: "text" },
    { name: "agreeLabel", type: "textarea" },
    { name: "submitLabel", type: "text" },
    { name: "errorMessage", type: "textarea" },
    { name: "privacyText", type: "textarea" },
    { name: "privacyLinkLabel", type: "text" },
    { name: "privacyHref", type: "text" },
    { name: "successTitle", type: "text" },
    { name: "successBody", type: "textarea" },
    { name: "successCtaLabel", type: "text" },
  ],
};
