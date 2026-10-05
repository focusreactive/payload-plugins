import type { Block } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";
import { link } from "@/lib/fields/link";

export const PostsListBlock: Block = injectSection({
  slug: "postsList",
  interfaceName: "PostsListBlock",
  ...getBlockPreviewImage("Posts List"),
  labels: {
    plural: "Posts Lists",
    singular: "Posts List",
  },
  fields: [
    ...sectionHeaderFields(),
    {
      type: "row",
      fields: [
        {
          admin: { width: "34%" },
          defaultValue: "latest",
          label: "Source",
          name: "source",
          options: [
            { label: "Latest posts", value: "latest" },
            { label: "By tag", value: "tag" },
            { label: "By author", value: "author" },
          ],
          required: true,
          type: "select",
        },
        {
          admin: {
            condition: (_, siblingData) => siblingData?.source === "tag",
            width: "33%",
          },
          label: "Tag",
          name: "tag",
          relationTo: "tags",
          type: "relationship",
        },
        {
          admin: {
            condition: (_, siblingData) => siblingData?.source === "author",
            width: "33%",
          },
          label: "Author",
          name: "author",
          relationTo: "authors",
          type: "relationship",
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          admin: { width: "34%" },
          defaultValue: 3,
          label: "Number of posts",
          max: 12,
          min: 1,
          name: "limit",
          required: true,
          type: "number",
        },
        {
          admin: { width: "66%" },
          defaultValue: "grid",
          label: "Layout",
          name: "layout",
          options: [
            { label: "Grid (cards)", value: "grid" },
            { label: "List (dense rows)", value: "list" },
            { label: "Featured + two", value: "featured" },
          ],
          required: true,
          type: "select",
        },
      ],
    },
    link({
      appearances: false,
      required: false,
      overrides: {
        admin: {
          description: "Optional “View all” link under the list",
        },
        label: "View all link",
        name: "viewAll",
      },
    }),
  ],
});
