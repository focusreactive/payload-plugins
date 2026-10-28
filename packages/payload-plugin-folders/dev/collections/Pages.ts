import type { Access, CollectionConfig } from "payload";

// The drafter role may save drafts but not publish; publish rights are tested from P-20.
const refuseDrafterPublish: Access = ({ data, req }) => {
  const isDrafter = (req.user as { role?: string } | null)?.role === "drafter";
  return !(isDrafter && data?._status === "published");
};

export const Pages: CollectionConfig = {
  slug: "pages",
  access: { update: refuseDrafterPublish },
  admin: { useAsTitle: "title" },
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "slug", type: "text", localized: true },
    {
      name: "blocks",
      type: "blocks",
      blocks: [
        { slug: "hero", fields: [{ name: "heading", type: "text", localized: true }] },
        { slug: "content", fields: [{ name: "body", type: "textarea", localized: true }] },
      ],
    },
  ],
  versions: { drafts: { autosave: true } },
};
