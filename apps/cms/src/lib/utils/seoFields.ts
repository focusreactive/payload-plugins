import { seoTextField } from "@focus-reactive/payload-plugin-seo";
import type { Field } from "payload";

export const generateSeoFields = ({
  robotsDefault = "index",
  generation = false,
}: { robotsDefault?: "index" | "noindex"; generation?: boolean } = {}): Field[] => [
  seoTextField({
    name: "title",
    kind: "title",
    label: "Meta title",
    showButton: generation,
    generateOnPublish: generation,
  }),
  {
    admin: {
      description: "Image used when sharing this page on social media.",
    },
    label: "Meta image",
    name: "image",
    relationTo: "media",
    type: "upload",
  },
  seoTextField({
    name: "description",
    kind: "description",
    label: "Meta description",
    showButton: generation,
    generateOnPublish: generation,
  }),
  {
    admin: {
      description: "Allow search engines to index this page",
    },
    defaultValue: robotsDefault,
    label: "Robots",
    name: "robots",
    options: [
      { label: "Index", value: "index" },
      { label: "No Index", value: "noindex" },
    ],
    type: "select",
  },
];
