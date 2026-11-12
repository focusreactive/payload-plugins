import { vercelStegaDecode } from "@vercel/stega";
import { renderHook } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { PayloadConfigs } from "../support/payloadConfig";

import { useEditableSchema } from "../../src/admin/instantPreview/useEditableSchema";
import { markRead } from "../../src/server/markRead";
import { createSchemaCache } from "../../src/server/schemaCache";
import { buildPayloadConfigs } from "../support/payloadConfig";

type EntityLookup = { collectionSlug?: string; globalSlug?: string };

const admin = vi.hoisted(() => ({ configs: null as PayloadConfigs | null }));

const clientConfig = () => {
  if (!admin.configs) throw new Error("The Payload config is not built yet");
  return admin.configs.client;
};

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({
    config: clientConfig(),
    getEntityConfig: ({ collectionSlug, globalSlug }: EntityLookup) =>
      collectionSlug
        ? clientConfig().collections.find(({ slug }) => slug === collectionSlug)
        : clientConfig().globals.find(({ slug }) => slug === globalSlug),
  }),
}));

const QUOTE_SCHEMA = { blockName: "text", quote: "text" };

const COLUMNS_SCHEMA: Record<string, unknown> = { blockName: "text", caption: "text" };
COLUMNS_SCHEMA.columns = { columns: COLUMNS_SCHEMA };

const SECTION_SCHEMA: Record<string, unknown> = { blockName: "text", heading: "text" };
SECTION_SCHEMA.rows = {
  grid: { blockName: "text", cells: { quote: QUOTE_SCHEMA, section: SECTION_SCHEMA } },
};

const PAGES_SCHEMA = {
  layout: {
    divider: { label: "text" },
    hero: { blockName: "text", heading: "text", items: { caption: "text" } },
  },
  lead: "text",
  links: { label: "text" },
  meta: { description: "textarea" },
  sections: { columns: COLUMNS_SCHEMA, quote: QUOTE_SCHEMA, section: SECTION_SCHEMA },
  seo: { headline: "text" },
  title: "text",
};

const adminSchema = (slugs: EntityLookup, excludeFieldNames?: string[]) =>
  renderHook(() => useEditableSchema(slugs, excludeFieldNames)).result.current;

const serverSchema = (slug: string) => {
  if (!admin.configs) throw new Error("The Payload config is not built yet");
  const { server } = admin.configs;
  const source = {
    blocks: Object.fromEntries((server.blocks ?? []).map((block) => [block.slug, block])),
    collections: Object.fromEntries(server.collections.map((config) => [config.slug, { config }])),
    config: server,
  };
  return createSchemaCache().get(slug, source);
};

describe("the editable schema of a Payload config", () => {
  beforeAll(async () => {
    admin.configs = await buildPayloadConfigs();
  });

  it("lists in the admin the text fields of tabs, groups, arrays, blocks and referenced blocks", () => {
    expect(adminSchema({ collectionSlug: "pages" })).toEqual(PAGES_SCHEMA);
  });

  it("marks on the server the fields the admin sends", () => {
    expect(serverSchema("pages")).toEqual(PAGES_SCHEMA);
  });

  it("marks the text of a referenced block on a draft read", () => {
    const page = {
      id: "page-1",
      sections: [{ blockType: "quote", id: "row-a", quote: "Stay curious" }],
    };
    const [quote] = markRead(page, {
      identity: { collectionSlug: "pages", docId: "page-1", kind: "collection" },
      schema: serverSchema("pages"),
    }).sections;

    expect(vercelStegaDecode(quote?.quote ?? "")).toMatchObject({ path: "sections.0.quote" });
  });

  describe("with a referenced block nested in itself", () => {
    const nestedSections = {
      id: "page-1",
      sections: [
        {
          blockType: "section",
          heading: "Outer",
          id: "row-a",
          rows: [
            {
              blockType: "grid",
              cells: [{ blockType: "section", heading: "Inner", id: "row-c" }],
              id: "row-b",
            },
          ],
        },
        {
          blockType: "columns",
          caption: "First level",
          columns: [
            {
              blockType: "columns",
              caption: "Second level",
              columns: [{ blockType: "columns", caption: "Third level", id: "row-f" }],
              id: "row-e",
            },
          ],
          id: "row-d",
        },
      ],
    };

    const markedSections = () =>
      markRead(nestedSections, {
        identity: { collectionSlug: "pages", docId: "page-1", kind: "collection" },
        instantPreview: true,
        schema: serverSchema("pages"),
      }).sections;

    it("marks the text of a block that comes back through another block", () => {
      const [section] = markedSections();

      expect(vercelStegaDecode(section?.rows?.[0]?.cells[0]?.heading ?? "")).toMatchObject({
        key: "sections.row-a.rows.row-b.cells.row-c.heading",
        path: "sections.0.rows.0.cells.0.heading",
      });
    });

    it("marks the text of a block on every level it contains itself", () => {
      const [, columns] = markedSections();

      expect(vercelStegaDecode(columns?.columns?.[0]?.columns[0]?.caption ?? "")).toMatchObject({
        path: "sections.1.columns.0.columns.0.caption",
      });
    });
  });

  it("sends nothing from a collection with auth", () => {
    expect(adminSchema({ collectionSlug: "users" })).toEqual({});
  });

  it("lists the text fields of a global", () => {
    expect(adminSchema({ globalSlug: "nav" })).toEqual({ label: "text" });
    expect(serverSchema("nav")).toEqual({ label: "text" });
  });

  it("leaves out the field names the project excludes", () => {
    expect(adminSchema({ collectionSlug: "pages" }, ["title"])).not.toHaveProperty("title");
  });

  it("lists nothing for a document it does not know", () => {
    expect(adminSchema({ collectionSlug: "missing" })).toEqual({});
    expect(adminSchema({})).toEqual({});
  });
});
