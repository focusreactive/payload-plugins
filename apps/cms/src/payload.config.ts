import path from "node:path";
import { fileURLToPath } from "node:url";

import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { en } from "@payloadcms/translations/languages/en";
import { es } from "@payloadcms/translations/languages/es";
import { fr } from "@payloadcms/translations/languages/fr";
import { ja } from "@payloadcms/translations/languages/ja";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Authors } from "@/collections/Authors";
import { Categories } from "@/collections/Categories";
import { DocumentEmbeddings } from "@/collections/DocumentEmbeddings";
import { Footer } from "@/collections/Footer/config";
import { GlobalBlock } from "@/collections/GlobalBlock/config";
import { Header } from "@/collections/Header/config";
import { Insight } from "@/collections/Insight";
import { Media } from "@/collections/Media";
import { Page } from "@/collections/Page/Page";
import { Person } from "@/collections/Person";
import { Posts } from "@/collections/Posts";
import { Testimonials } from "@/collections/Testimonials";
import { Users } from "@/collections/Users";
import { I18N_CONFIG } from "@/lib/config/i18n";
import { createDatabaseAdapter } from "@/lib/database";
import { SiteSettings } from "@/globals/SiteSettings/config";
import { plugins } from "@/lib/plugins";

const baseDir = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    // Payload's default long form ("September 24th 2026, 3:08 PM") overflows the document header
    // and gets cut off, so Last Modified and Created showed only half a date. The setting is one
    // date-fns pattern applied everywhere, so dropping the year only in the current year would mean
    // replacing Payload's own document controls.
    dateFormat: "MMM d, yyyy",
    components: {
      afterLogin: ["/components/admin/SSOButtons"],
      beforeNavLinks: ["/components/admin/EditorialNavGroup#EditorialNavGroup"],
      graphics: {
        Icon: "/components/admin/Icon",
        Logo: "/components/admin/Logo",
      },
      providers: ["/lib/context/BeforeOpenDrawerWrapper", "/lib/context/SeoExtractorRegistrar"],
      views: {
        seoOverview: {
          Component: "/components/admin/SeoOverview/SeoOverviewView#SeoOverviewView",
          path: "/seo-overview",
        },
      },
    },
    importMap: {
      baseDir,
    },
    livePreview: {
      breakpoints: [
        {
          height: 667,
          label: "Mobile",
          name: "mobile",
          width: 375,
        },
        {
          height: 1024,
          label: "Tablet",
          name: "tablet",
          width: 768,
        },
        {
          height: 900,
          label: "Desktop",
          name: "desktop",
          width: 1440,
        },
      ],
    },
    meta: {
      titleSuffix: " - Marks & Clerk",
    },
    user: Users.slug,
  },
  collections: [
    // Content leads the nav (this demo is about content), with Page first within it;
    // Users moved out of the lead slot so the sidebar no longer opens on Administration.
    Page,
    Media,
    Categories,
    Authors,
    Posts,
    Person,
    Insight,
    Testimonials,
    Header,
    Footer,
    GlobalBlock,
    Users,
    DocumentEmbeddings,
  ],
  db: createDatabaseAdapter({
    connectionString: process.env.DATABASE_URL,
  }),
  editor: lexicalEditor(),
  globals: [SiteSettings],
  i18n: {
    fallbackLanguage: "en",
    supportedLanguages: { en, es, fr, ja },
    translations: {
      en: {
        sso: {
          dividerLabel: "SSO",
          signInWith: "Sign in with {{provider}}",
        },
      },
      es: {
        sso: {
          dividerLabel: "SSO",
          signInWith: "Iniciar sesión con {{provider}}",
        },
      },
    },
  },
  localization: {
    defaultLocale: I18N_CONFIG.defaultLocale,
    fallback: true,
    locales: I18N_CONFIG.locales,
  },
  plugins,
  secret: process.env.PAYLOAD_SECRET || "",
  sharp,
  typescript: {
    outputFile: path.resolve(baseDir, "payload-types.ts"),
  },
});
