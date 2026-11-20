import { relationsGraphWidget } from "@focus-reactive/payload-plugin-relations-graph";
import type { DashboardConfig, Option } from "payload";

/**
 * Home-page dashboard built on Payload's own widgets (`admin.dashboard`, experimental in
 * Payload). Editors can add, remove, resize and reconfigure widgets; `defaultLayout` is what
 * they see before they do.
 */
export const dashboardConfig = (collectionOptions: Option[]): DashboardConfig => ({
  defaultLayout: [
    { data: { collection: "pages" }, widgetSlug: "count", width: "x-small" },
    {
      data: { collection: "pages", label: "Pages in draft", status: "draft" },
      widgetSlug: "count",
      width: "x-small",
    },
    {
      data: {
        collection: "articles",
        dateField: "createdAt",
        label: "New articles this week",
        period: "7",
      },
      widgetSlug: "count",
      width: "x-small",
    },
    {
      data: { collection: "media", label: "Media files" },
      widgetSlug: "count",
      width: "x-small",
    },
    { widgetSlug: "overview", width: "medium" },
    { widgetSlug: "recent", width: "medium" },
    relationsGraphWidget(),
    { widgetSlug: "collections", width: "full" },
  ],
  widgets: [
    {
      Component: "/components/dashboard/CountWidget#CountWidget",
      fields: [
        { name: "collection", options: collectionOptions, required: true, type: "select" },
        {
          admin: { description: "Leave empty to build the heading from the settings below." },
          name: "label",
          type: "text",
        },
        {
          admin: { description: "Only applies to collections with drafts enabled." },
          defaultValue: "any",
          name: "status",
          options: [
            { label: "Any", value: "any" },
            { label: "Draft or unpublished changes", value: "draft" },
            { label: "Published", value: "published" },
          ],
          type: "select",
        },
        {
          defaultValue: "all",
          name: "period",
          options: [
            { label: "All time", value: "all" },
            { label: "Last 24 hours", value: "1" },
            { label: "Last 7 days", value: "7" },
            { label: "Last 30 days", value: "30" },
          ],
          type: "select",
        },
        {
          defaultValue: "updatedAt",
          name: "dateField",
          options: [
            { label: "Updated", value: "updatedAt" },
            { label: "Created", value: "createdAt" },
          ],
          type: "select",
        },
        {
          admin: {
            description:
              'Optional extra filter. Example: field "stage", equals "review" — counts documents in review.',
          },
          fields: [
            { admin: { width: "50%" }, label: "Field", name: "field", type: "text" },
            { admin: { width: "50%" }, label: "Equals", name: "value", type: "text" },
          ],
          type: "row",
        },
      ],
      label: "Document count",
      maxWidth: "medium",
      minWidth: "x-small",
      slug: "count",
    },
    {
      Component: "/components/dashboard/OverviewWidget#OverviewWidget",
      fields: [
        {
          admin: { description: "Leave empty to list every collection." },
          hasMany: true,
          name: "collections",
          options: collectionOptions,
          type: "select",
        },
      ],
      label: "Collections overview",
      maxWidth: "full",
      minWidth: "medium",
      slug: "overview",
    },
    {
      Component: "/components/dashboard/RecentWidget#RecentWidget",
      fields: [
        {
          admin: { description: "Leave empty to watch every collection." },
          hasMany: true,
          name: "collections",
          options: collectionOptions,
          type: "select",
        },
        { defaultValue: 8, max: 30, min: 1, name: "limit", type: "number" },
      ],
      label: "Recent changes",
      maxWidth: "full",
      minWidth: "small",
      slug: "recent",
    },
  ],
});
