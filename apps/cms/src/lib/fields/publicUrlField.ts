import type { UIField } from "payload";

import { getServerSideURL } from "@/lib/utils/getURL";

export const PUBLIC_URL_FIELD_NAME = "publicUrl";

/**
 * List-view-only "URL" column for Pages and Posts: renders the document's public
 * path (nested parents, `/blog` prefix, locale prefix) as a link to the live site.
 *
 * A `ui` field stores nothing and renders nothing in the edit view. The cell reads
 * `slug` / `breadcrumbs` from the row, which the list view loads in full as long as
 * `admin.enableListViewSelectAPI` stays off for these collections.
 *
 * The site origin is resolved here, on the server, because the client bundle
 * only sees `NEXT_PUBLIC_*` env vars (not `VERCEL_PROJECT_PRODUCTION_URL`).
 */
export const publicUrlField = (): UIField => ({
  admin: {
    components: {
      Cell: {
        clientProps: { siteUrl: getServerSideURL() },
        path: "/components/admin/PublicUrlCell#PublicUrlCell",
      },
    },
  },
  label: {
    en: "URL",
    es: "URL",
  },
  name: PUBLIC_URL_FIELD_NAME,
  type: "ui",
});
