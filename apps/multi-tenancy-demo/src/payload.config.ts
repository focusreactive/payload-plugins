import path from "node:path";
import { fileURLToPath } from "node:url";

import { visualEditingPlugin } from "@fr-private/payload-plugin-visual-editing";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { multiTenantPlugin } from "@payloadcms/plugin-multi-tenant";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";

import { Pages } from "./collections/Pages";
import { Tenants } from "./collections/Tenants";
import { Users } from "./collections/Users";

const baseDir = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    importMap: {
      baseDir,
    },
    // Live Preview for the tenant-scoped `pages` collection. The preview iframe
    // points at the frontend route /<tenant-slug>/<page-slug>; the editor's
    // unsaved changes stream into it live via window.postMessage (see the
    // useLivePreview hook in the (frontend)/[tenant]/[page] route).
    livePreview: {
      collections: ["pages"],
      // Generous heights so the editable hero/content is visible without
      // scrolling inside the preview iframe. "Responsive" (Payload's default)
      // fills the whole preview pane.
      breakpoints: [
        { label: "Mobile", name: "mobile", width: 390, height: 844 },
        { label: "Tablet", name: "tablet", width: 768, height: 1024 },
        { label: "Desktop", name: "desktop", width: 1280, height: 1100 },
      ],
      // The page's `tenant` is a relationship id, but the frontend URL needs the
      // tenant slug — so resolve it (`url` may be async). The URL is routed
      // through /next/preview so the iframe loads in Next.js draft mode, which
      // is what the visual-editing overlay and stega enrichment require.
      url: async ({ data, req }) => {
        const base = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4041";
        const tenantRef = data?.tenant as { id?: number } | number | null | undefined;
        const tenantId = typeof tenantRef === "object" && tenantRef ? tenantRef.id : tenantRef;
        let tenantSlug = "";
        if (tenantId) {
          const tenant = await req.payload.findByID({ collection: "tenants", id: tenantId, depth: 0 });
          tenantSlug = (tenant?.slug as string) ?? "";
        }
        const previewPath = `/${tenantSlug}/${(data?.slug as string) ?? ""}`;
        return `${base}/next/preview?path=${encodeURIComponent(previewPath)}`;
      },
    },
    user: Users.slug,
  },
  collections: [Users, Tenants, Pages],
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || "file:./multi-tenancy-demo.db",
    },
  }),
  editor: lexicalEditor(),
  plugins: [
    multiTenantPlugin({
      // Collections to scope by tenant. The plugin injects a `tenant` field into
      // each and filters their admin list views by the selected tenant.
      collections: {
        pages: {},
      },
      // Show the injected `tenant` field in the admin so the scoping is visible
      // for demo clarity.
      debug: true,
    }),
    // Embeds field-path markers (Vercel stega) into draft content and renders
    // click-to-edit overlays on the frontend that deep-link back into the admin.
    // `tenant` is the multi-tenant relationship field — exclude it from stega.
    visualEditingPlugin({
      excludeFieldNames: ["tenant"],
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(baseDir, "payload-types.ts"),
  },
});
