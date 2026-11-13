import type { Block, ClientConfig, Config, SanitizedConfig } from "payload";

import { initI18n } from "@payloadcms/translations";
import { buildConfig, createClientConfig } from "payload";

const databaseStub: Config["db"] = {
  defaultIDType: "text",
  init: () => {
    throw new Error("The test config has no database");
  },
  name: "test",
};

export const configOf = (config: Omit<Config, "db" | "secret">): Config => ({
  db: databaseStub,
  secret: "test-secret",
  ...config,
});

const quoteBlock: Block = { slug: "quote", fields: [{ name: "quote", type: "text" }] };

const columnsBlock: Block = {
  slug: "columns",
  fields: [
    { name: "caption", type: "text" },
    { name: "columns", type: "blocks", blockReferences: ["columns"], blocks: [] },
  ],
};

const sectionBlock: Block = {
  slug: "section",
  fields: [
    { name: "heading", type: "text" },
    { name: "rows", type: "blocks", blockReferences: ["grid"], blocks: [] },
  ],
};

const gridBlock: Block = {
  slug: "grid",
  fields: [{ name: "cells", type: "blocks", blockReferences: ["section", "quote"], blocks: [] }],
};

const projectConfig = configOf({
  blocks: [quoteBlock, columnsBlock, sectionBlock, gridBlock],
  collections: [
    {
      slug: "pages",
      fields: [
        { name: "title", type: "text" },
        {
          type: "tabs",
          tabs: [
            { name: "seo", fields: [{ name: "headline", type: "text" }] },
            { label: "Content", fields: [{ name: "lead", type: "text" }] },
          ],
        },
        { name: "meta", type: "group", fields: [{ name: "description", type: "textarea" }] },
        { name: "links", type: "array", fields: [{ name: "label", type: "text" }] },
        {
          name: "layout",
          type: "blocks",
          blocks: [
            {
              slug: "hero",
              fields: [
                { name: "heading", type: "text" },
                { name: "items", type: "array", fields: [{ name: "caption", type: "text" }] },
              ],
            },
            {
              slug: "divider",
              admin: { disableBlockName: true },
              fields: [{ name: "label", type: "text" }],
            },
          ],
        },
        {
          name: "sections",
          type: "blocks",
          blockReferences: ["quote", "columns", "section"],
          blocks: [],
        },
      ],
      folders: true,
      orderable: true,
      trash: true,
      versions: { drafts: true },
    },
    { slug: "media", fields: [{ name: "alt", type: "text" }], upload: true },
    {
      slug: "users",
      auth: { useAPIKey: true, verify: true },
      fields: [{ name: "name", type: "text" }],
    },
  ],
  folders: {},
  globals: [{ slug: "nav", fields: [{ name: "label", type: "text" }] }],
});

export type PayloadConfigs = { client: ClientConfig; server: SanitizedConfig };

export const buildPayloadConfigs = async (): Promise<PayloadConfigs> => {
  const server = await buildConfig(projectConfig);
  const i18n = await initI18n({ config: server.i18n, context: "client", language: "en" });
  const client = createClientConfig({ config: server, i18n, importMap: {}, user: true });
  return { client, server };
};

export const fieldsOfCollection = <T extends { collections: { fields: unknown; slug: string }[] }>(
  config: T,
  slug: string
): T["collections"][number]["fields"] => {
  const collection = config.collections.find((candidate) => candidate.slug === slug);
  if (!collection) throw new Error(`No collection "${slug}" in the test config`);
  return collection.fields;
};
