import { mcpPlugin } from "@payloadcms/plugin-mcp";
import type { PayloadRequest } from "payload";

import { buildUrl } from "@/core/utils/path/buildUrl";
import type { Page } from "@/payload-types";

import { LOCAL_DEV_MCP_USER, LOCAL_HOSTS } from "./constants/local";
import { createMcpTools } from './tools';
import type { McpToolsRegistry } from './tools';
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

    if (!host) {return false;}

    return LOCAL_HOSTS.includes(host);
  }
}

const registry: McpToolsRegistry = {
  collections: {
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
    page: {
      buildUrl: (doc, locale) =>
        buildUrl({
          collection: "page",
          breadcrumbs: doc.breadcrumbs as Page["breadcrumbs"],
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
          collection: "posts",
          slug: doc?.slug as string,
          absolute: false,
          locale: locale ?? "en",
        }),
      skipKeys: ["id"],
      tableFields: ["slug", "_status", "publishedAt", "excerpt"],
      titleField: "title",
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
      user: LOCAL_DEV_MCP_USER,
      page: { create: true, delete: true, find: false, update: true },
      posts: { create: true, delete: true, find: false, update: true },
      header: { create: true, delete: true, find: false, update: true },
      footer: { create: true, delete: true, find: false, update: true },
      "payload-mcp-tool": {
        getDocument: true,
        getAllDocuments: true,
        getGlobalDocument: true,
        getField: true,
        uploadImage: true,
      },
    };
  },
});
