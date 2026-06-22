import { mcpPlugin } from "@payloadcms/plugin-mcp";
import type { PayloadRequest } from "payload";

import { buildUrl } from "@/lib/utils/path/buildUrl";
import type { Page } from "@/payload-types";

import { LOCAL_DEV_MCP_USER, LOCAL_HOSTS } from "./constants/local";
import { createMcpTools } from "./tools";
import type { McpToolsRegistry } from "./tools";
import { uploadImage } from "./tools/uploadImage";

function isLocalDevMcpRequest(req: PayloadRequest) {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  if (process.env.PAYLOAD_MCP_LOCAL_AUTH_BYPASS === "false") {
    return false;
  }

  try {
    if (!req.url) {
      return false;
    }

    const url = new URL(req.url);

    return LOCAL_HOSTS.includes(url.hostname);
  } catch {
    const host = req.headers.get("host")?.split(":")[0];

    if (!host) {
      return false;
    }

    return LOCAL_HOSTS.includes(host);
  }
}

const registry: McpToolsRegistry = {
  collections: {
    authors: {
      skipKeys: ["id"],
      tableFields: [],
      titleField: "name",
    },
    categories: {
      skipKeys: ["id"],
      tableFields: ["slug"],
      titleField: "title",
    },
    footer: {
      skipKeys: ["id"],
      tableFields: [],
      titleField: "name",
    },
    header: {
      skipKeys: ["id"],
      tableFields: [],
      titleField: "name",
    },
    media: {
      skipKeys: ["id"],
      tableFields: ["filename", "alt"],
      titleField: "filename",
    },
    page: {
      buildUrl: (doc, locale) =>
        buildUrl({
          breadcrumbs: doc.breadcrumbs as Page["breadcrumbs"],
          collection: "page",
          locale: locale ?? "en",
        }),
      skipKeys: [
        "id",
        "generateSlug",
        "parent",
        "folder",
        "_abPassPercentage",
        "_abVariantOf",
        "_abVariantPercentages",
      ],
      tableFields: ["slug", "_status"],
      titleField: "title",
    },
    posts: {
      buildUrl: (doc, locale) =>
        buildUrl({
          absolute: false,
          collection: "posts",
          locale: locale ?? "en",
          slug: doc?.slug as string,
        }),
      skipKeys: ["id"],
      tableFields: ["slug", "_status", "publishedAt", "excerpt"],
      titleField: "title",
    },
    testimonials: {
      skipKeys: ["id"],
      tableFields: ["company", "rating"],
      titleField: "author",
    },
    users: {
      skipKeys: ["id"],
      tableFields: ["name", "role", "email"],
      titleField: "email",
    },
  },
  globals: {
    "site-settings": {
      titleField: "siteName",
    },
  },
};

export const mcpPluginConfig = mcpPlugin({
  collections: {
    authors: {
      description:
        "Blog authors. Each author has a name and an avatar image. Use this collection to read, create, update or delete authors.",
      enabled: {
        create: true,
        delete: true,
        find: false,
        update: true,
      },
    },
    categories: {
      description:
        "Blog categories. Each category has a localized title and URL slug. Supports localization (en/es). Use this collection to read, create, update or delete blog categories.",
      enabled: {
        create: true,
        delete: true,
        find: false,
        update: true,
      },
    },
    footer: {
      description:
        "Site footer configurations. Each footer has a name, logo, navigation links (up to 10), body text, and copyright text. Supports draft/publish versioning and localization (en/es). Use this collection to read, create, update or delete site footers.",
      enabled: {
        create: true,
        delete: true,
        find: false,
        update: true,
      },
    },
    header: {
      description:
        "Site header configurations. Each header has a name, logo, and navigation items (up to 6 links). Supports draft/publish versioning and localization (en/es). Use this collection to read, create, update or delete site headers.",
      enabled: {
        create: true,
        delete: true,
        find: false,
        update: true,
      },
    },
    media: {
      description:
        "Media library of uploaded files (images and documents). Each item has localized alt text, an optional rich-text caption, platform-default flags, and generated image sizes. Use this collection to read, create, update or delete media.",
      enabled: {
        create: true,
        delete: true,
        find: false,
        update: true,
      },
    },
    page: {
      description:
        "Website pages built with a block-based layout system. Each page has a title, URL slug, nested hierarchy (parent/breadcrumbs), and a flexible block editor for composing content sections such as Hero, Content, FAQ, and more. Supports draft/publish versioning and localization (en/es). Use this collection to read, create, update or delete site pages.",
      enabled: {
        create: true,
        delete: true,
        find: false,
        update: true,
      },
    },
    posts: {
      description:
        "Blog posts. Each post has a title, excerpt, hero image, rich-text body, SEO metadata, categories, authors, and related posts. Supports draft/publish versioning and localization (en/es). Use this collection to read, create, update or delete blog articles.",
      enabled: {
        create: true,
        delete: true,
        find: false,
        update: true,
      },
    },
    testimonials: {
      description:
        "Customer testimonials. Each testimonial has an author, company, position, avatar, localized review content, and a 1–5 rating. Supports localization (en/es). Use this collection to read, create, update or delete testimonials.",
      enabled: {
        create: true,
        delete: true,
        find: false,
        update: true,
      },
    },
    users: {
      description:
        "CMS user accounts. Each user has a name, email, and role (admin/author/user). Authentication-enabled. Use this collection to read, create, update or delete users.",
      enabled: {
        create: true,
        delete: true,
        find: false,
        update: true,
      },
    },
  },
  globals: {
    "site-settings": {
      description:
        "Global site settings singleton: site name, header/footer references, admin panel branding, SEO defaults, 404 page content, and blog listing configuration. Supports draft/publish versioning and localization (en/es). Use to read or update site-wide settings.",
      enabled: {
        find: false,
        update: true,
      },
    },
  },
  mcp: {
    tools: [
      ...createMcpTools(registry),
      uploadImage,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any,
  },
  overrideAuth: async (req, getDefaultMcpAccessSettings) => {
    if (!isLocalDevMcpRequest(req)) {
      return getDefaultMcpAccessSettings();
    }

    return {
      authors: { create: true, delete: true, find: false, update: true },
      categories: { create: true, delete: true, find: false, update: true },
      footer: { create: true, delete: true, find: false, update: true },
      header: { create: true, delete: true, find: false, update: true },
      media: { create: true, delete: true, find: false, update: true },
      page: { create: true, delete: true, find: false, update: true },
      "payload-mcp-tool": {
        getAllDocuments: true,
        getDocument: true,
        getField: true,
        getGlobalDocument: true,
        uploadImage: true,
      },
      posts: { create: true, delete: true, find: false, update: true },
      siteSettings: { find: false, update: true },
      testimonials: { create: true, delete: true, find: false, update: true },
      users: { create: true, delete: true, find: false, update: true },
      user: LOCAL_DEV_MCP_USER,
    };
  },
});
