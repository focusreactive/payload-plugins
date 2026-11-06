import { Forbidden, QueryError, ValidationError } from "payload";
import type { Endpoint, PayloadRequest, Where } from "payload";
import { mergeListSearchAndWhere } from "payload/shared";
import { MAX_EXPORT_ROWS, MAX_WHERE_PATHS } from "../constants";
import { recordAuditEvent } from "../core/writeEvent";
import type { ResolvedOptions } from "../options";
import { logError } from "../utils/logError";
import { whereFieldPaths } from "../utils/whereFieldPaths";
import { csvHeader, csvRows, ndjsonRows } from "./serialize";

type ExportFormat = "csv" | "ndjson";
type Row = { id: number | string; occurredAt: string };
type Page = { docs: Row[]; hasMore: boolean };

const PAGE_SIZE = 1000;

const CONTENT_TYPE_BY_FORMAT: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  ndjson: "application/x-ndjson",
};

const errorResponse = (error: string, status: number): Response => {
  const body = JSON.stringify({ error });
  return new Response(body, { status, headers: { "content-type": "application/json" } });
};

function firstPageFailureResponse(req: PayloadRequest, error: unknown): Response {
  if (error instanceof Forbidden) return errorResponse("Forbidden", 403);
  if (error instanceof QueryError || error instanceof ValidationError) {
    return errorResponse(error.message, 400);
  }
  logError(req.payload, "could not read the audit log for the export", error);
  return errorResponse("Internal Server Error", 500);
}

const olderThan = (row: Row): Where => ({
  or: [
    { occurredAt: { less_than: row.occurredAt } },
    { and: [{ occurredAt: { equals: row.occurredAt } }, { id: { less_than: row.id } }] },
  ],
});

type ListQuery = { where?: unknown; search?: unknown };

const listQueryOf = (req: PayloadRequest): ListQuery => (req.query as ListQuery | undefined) ?? {};

const requestedWhere = ({ where }: ListQuery): Where =>
  where && typeof where === "object" ? (where as Where) : {};

const requestedSearch = ({ search }: ListQuery): string =>
  typeof search === "string" ? search : "";

function requestedListWhere(req: PayloadRequest, slug: string): Where {
  const query = listQueryOf(req);
  const where = requestedWhere(query);
  const collection = req.payload.collections[slug as never];
  if (!collection) return where;
  return mergeListSearchAndWhere({
    collectionConfig: collection.config,
    search: requestedSearch(query),
    where,
  });
}

function createPageReader(req: PayloadRequest, slug: string, where: Where) {
  return async (after?: Row): Promise<Page> => {
    const { docs } = await req.payload.find({
      collection: slug as never,
      where: after ? { and: [where, olderThan(after)] } : where,
      sort: ["-occurredAt", "-id"],
      limit: PAGE_SIZE + 1,
      depth: 0,
      pagination: false,
      overrideAccess: false,
      user: req.user,
      req,
    });
    const rows = docs as unknown as Row[];
    return { docs: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
  };
}

function streamPages(
  firstPage: Page,
  readPageAfter: (row?: Row) => Promise<Page>,
  format: ExportFormat
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const serialize = format === "csv" ? csvRows : ndjsonRows;
  let page = firstPage;
  let rowsSent = 0;
  let headerSent = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (headerSent) {
          page = await readPageAfter(page.docs.at(-1));
        } else {
          headerSent = true;
          if (format === "csv") controller.enqueue(encoder.encode(csvHeader()));
        }
        const docs = page.docs.slice(0, MAX_EXPORT_ROWS - rowsSent);
        rowsSent += docs.length;
        controller.enqueue(encoder.encode(serialize(docs)));
        if (!page.hasMore || rowsSent >= MAX_EXPORT_ROWS) controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export function buildExportEndpoint(opts: ResolvedOptions): Endpoint {
  return {
    path: "/export",
    method: "get",
    handler: async (req: PayloadRequest) => {
      if (!req.user) return errorResponse("Unauthorized", 401);
      const format: ExportFormat = req.searchParams.get("format") === "ndjson" ? "ndjson" : "csv";
      const where = requestedListWhere(req, opts.slug);
      const readPageAfter = createPageReader(req, opts.slug, where);

      let firstPage: Page;
      try {
        firstPage = await readPageAfter();
      } catch (error) {
        return firstPageFailureResponse(req, error);
      }

      await recordAuditEvent(req, opts.slug, {
        action: "audit.export",
        target: { kind: "audit", slug: opts.slug },
        metadata: {
          format,
          whereFields: whereFieldPaths(where).slice(0, MAX_WHERE_PATHS),
          maxRows: MAX_EXPORT_ROWS,
        },
      });

      return new Response(streamPages(firstPage, readPageAfter, format), {
        headers: {
          "content-type": CONTENT_TYPE_BY_FORMAT[format],
          "content-disposition": `attachment; filename="audit-log.${format}"`,
        },
      });
    },
  };
}
