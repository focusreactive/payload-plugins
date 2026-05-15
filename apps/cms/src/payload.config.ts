import path from "node:path";
import { fileURLToPath } from "node:url";

import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { en } from "@payloadcms/translations/languages/en";
import { es } from "@payloadcms/translations/languages/es";
import { createDatabaseAdapter } from "@repo/database";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Authors } from "@/collections/Authors";
import { Categories } from "@/collections/Categories";
import { DocumentEmbeddings } from "@/collections/DocumentEmbeddings";
import { Footer } from "@/collections/Footer/config";
import { Header } from "@/collections/Header/config";
import { Media } from "@/collections/Media";
import { Page } from "@/collections/Page/Page";
import { Posts } from "@/collections/Posts";
import { Testimonials } from "@/collections/Testimonials";
import { Users } from "@/collections/Users";
import { I18N_CONFIG } from "@/core/config/i18n";
import { SiteSettings } from "@/globals/SiteSettings/config";
import { plugins } from "@/plugins";

const filename = import.meta.filename;
const dirname = import.meta.dirname;

export default buildConfig({
  admin: {
    components: {
      afterLogin: ["/core/ui/components/Admin/SSOButtons"],
      graphics: {
        Icon: "/core/ui/components/Admin/Icon",
        Logo: "/core/ui/components/Admin/Logo",
      },
      providers: ["/providers/BeforeOpenDrawerWrapper"],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    livePreview: {
      breakpoints: [
        {
          label: "Mobile",
          name: "mobile",
          width: 375,
          height: 667,
        },
        {
          label: "Tablet",
          name: "tablet",
          width: 768,
          height: 1024,
        },
        {
          label: "Desktop",
          name: "desktop",
          width: 1440,
          height: 900,
        },
      ],
    },
    user: Users.slug,
  },
  collections: [
    Users,
    Media,
    Page,
    Categories,
    Authors,
    Posts,
    Testimonials,
    Header,
    Footer,
    DocumentEmbeddings,
  ],
  db: createDatabaseAdapter({
    connectionString: process.env.DATABASE_URL,
  }),
  editor: lexicalEditor(),
  globals: [SiteSettings],
  i18n: {
    fallbackLanguage: "en",
    supportedLanguages: { en, es },
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
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
