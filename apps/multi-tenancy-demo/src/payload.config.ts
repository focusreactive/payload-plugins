import path from "node:path";
import { fileURLToPath } from "node:url";

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
  ],
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(baseDir, "payload-types.ts"),
  },
});
