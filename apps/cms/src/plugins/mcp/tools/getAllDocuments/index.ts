import type { CollectionSlug, Where } from "payload";
import { z } from "zod";

import type { Locale } from "@/core/types";

import type { BaseDocument, McpTool } from "../../types";
import type { McpToolsRegistry } from "../index";
import { buildDocumentsContent } from "./buildDocumentsContent";

export function createGetAllDocumentsTool(
  registry: McpToolsRegistry,
  knownCollections: Set<CollectionSlug>
): McpTool {
  const knownSlugs = [...knownCollections].join(", ");

  return {
    description: `List collection documents as a formatted summary. Specify collectionSlug (one of: ${knownSlugs}). Returns only scalar summary fields plus admin URL and public URL (where applicable). Objects, relations, arrays, and rich text are omitted from the list output. To get full details for a document, call getDocument with its ID. The response is pre-formatted Markdown — output it verbatim without reformatting or summarizing.`,
    handler: async (args, req) => {
      const {
        collectionSlug,
        limit = 10,
        page,
        locale,
        where,
      } = args as {
        collectionSlug: string;
        limit?: number;
        page?: number;
        locale?: Locale;
        where?: string;
      };

      const config = registry.collections[collectionSlug as CollectionSlug];
      if (!config) {
        return {
          content: [
            {
              text: `Error: unknown collectionSlug "${collectionSlug}". Known collections: ${knownSlugs}`,
              type: "text",
            },
          ],
        };
      }

      let parsedWhere: Where | undefined;
      if (where) {
        try {
          parsedWhere = JSON.parse(where) as Where;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);

          return {
            content: [{ text: `Error: invalid where JSON - ${msg}`, type: "text" }],
          };
        }
      }

      const collection = collectionSlug as CollectionSlug;

      const result = await req.payload.find({
        collection,
        depth: 0,
        limit,
        locale,
        overrideAccess: false,
        page,
        req,
        where: parsedWhere,
      });

      const { docs, totalDocs, page: currentPage, limit: effectiveLimit } = result;

      const content = buildDocumentsContent({
        buildUrl: config.buildUrl,
        collection,
        docs: docs as BaseDocument[],
        limit: effectiveLimit,
        locale,
        page: currentPage,
        payload: req.payload,
        tableFields: config.tableFields,
        titleField: config.titleField,
        totalDocs,
      });

      return { content };
    },
    name: "getAllDocuments",
    parameters: {
      collectionSlug: z.string().describe(`The collection slug. One of: ${knownSlugs}`),
      limit: z.number().optional().describe("Max documents to return (default 10)"),
      locale: z
        .string()
        .optional()
        .describe('Locale code, e.g. "en" or "es". Omit to use the default locale.'),
      page: z.number().optional().describe("Page number for pagination"),
      where: z
        .string()
        .optional()
        .describe(
          'Payload where clause as a JSON string, e.g. \'{"_status":{"equals":"published"}}\''
        ),
    },
  };
}
