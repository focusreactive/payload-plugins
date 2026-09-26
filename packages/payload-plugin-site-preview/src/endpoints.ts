import type { CollectionSlug, Endpoint, JsonObject, PayloadRequest } from "payload";

import { ASSETS_SEGMENT, ENDPOINT, FRAME_ENDPOINT, SITE_TIMEOUT_MS } from "./lib/constants.js";
import { injectPreview } from "./lib/injectPreview.js";
import { proxyAsset } from "./lib/proxyAsset.js";
import { readUnsaved } from "./lib/readUnsaved.js";
import { FRAME_ASSETS } from "./frame/assets.js";
import type { SitePreviewOptions } from "./types.js";

// A page's files arrive a hundred at a time right after it, and need only its site's origin.
const origins = new Map<string, string>();

const serverURL = (req: PayloadRequest) =>
  req.payload.config.serverURL || new URL(req.url || "http://localhost").origin;

const render = async (
  options: SitePreviewOptions,
  req: PayloadRequest,
  collection: CollectionSlug,
  id: string,
  data: JsonObject | null
) => {
  const request = await options.site({ req, collection, id, data });
  if (!request) {
    return new Response("Nothing to preview for this document.", { status: 404 });
  }
  origins.set(`${collection}:${id}`, new URL(request.url).origin);

  const res = await fetch(request.url, {
    method: data ? "POST" : "GET",
    headers: {
      ...(data && !request.body ? { "Content-Type": "application/json" } : {}),
      ...request.headers,
    },
    body: data ? (request.body ?? JSON.stringify({ doc: data })) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(SITE_TIMEOUT_MS),
  }).catch(() => null);
  if (!res) {
    return new Response(`The site at ${new URL(request.url).origin} did not answer.`, {
      status: 502,
    });
  }

  const api = req.payload.config.routes.api;
  const basePath = request.basePath ?? res.headers.get("x-preview-base") ?? "";
  const base = `${serverURL(req)}${api}${ENDPOINT}/${collection}/${id}/${ASSETS_SEGMENT}/${basePath}`;
  return new Response(
    injectPreview(await res.text(), {
      base,
      api,
      scrollOffset: options.scrollOffset,
      unsaved: options.unsaved !== false,
    }),
    {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "text/plain",
        "Cache-Control": "no-store",
      },
    }
  );
};

const readForm = async (req: PayloadRequest): Promise<JsonObject | null> => {
  const data = JSON.parse(
    new URLSearchParams(req.text ? await req.text() : "").get("data") || "null"
  );
  return data && typeof data === "object" && !Array.isArray(data) ? data : null;
};

export const previewEndpoints = (options: SitePreviewOptions): Endpoint[] => {
  // Only the configured collections, and only for someone signed in to the admin.
  const guard = (req: PayloadRequest) => {
    if (!req.user) {
      return new Response("Forbidden.", { status: 403 });
    }
    const collection = req.routeParams?.collection as CollectionSlug | undefined;
    const id = req.routeParams?.id as string | undefined;
    if (!collection || !options.collections.includes(collection) || !id) {
      return new Response("Not a previewed document.", { status: 404 });
    }
    return { collection, id };
  };

  // The document's page with the unsaved form data the frame posts back — unless the site renders
  // only what it has built.
  const unsavedEndpoint: Endpoint[] =
    options.unsaved === false
      ? []
      : [
          {
            // The document's page with the unsaved form data the frame posts back.
            path: `${ENDPOINT}/:collection/:id`,
            method: "post",
            handler: async (req) => {
              const target = guard(req);
              if (target instanceof Response) {
                return target;
              }
              const unsaved = await readForm(req).catch(() => undefined);
              if (unsaved === undefined) {
                return new Response("Form data is not JSON.", { status: 400 });
              }
              if (!unsaved) {
                return new Response("No data given.", { status: 400 });
              }
              const data = await readUnsaved(
                req,
                target.collection,
                { ...unsaved, id: target.id },
                options.depth ?? 2
              );
              return render(options, req, target.collection, target.id, data);
            },
          },
        ];

  return [
    ...unsavedEndpoint,
    {
      // The document's page, saved — or one of its files under `_/`.
      path: `${ENDPOINT}/:collection/:id/:path*`,
      method: "get",
      handler: async (req) => {
        const target = guard(req);
        if (target instanceof Response) {
          return target;
        }
        const [segment, ...path] = (req.routeParams?.path as string[] | undefined) ?? [];
        if (segment !== ASSETS_SEGMENT) {
          return render(options, req, target.collection, target.id, null);
        }

        const key = `${target.collection}:${target.id}`;
        if (!origins.has(key)) {
          const request = await options.site({ req, ...target, data: null });
          if (request) {
            origins.set(key, new URL(request.url).origin);
          }
        }
        const origin = origins.get(key);
        if (!origin) {
          return new Response("Nothing to preview for this document.", { status: 404 });
        }
        return proxyAsset(origin, path, new URL(req.url || "", "http://internal").search);
      },
    },
    {
      // The plugin's own script and styles for the frame.
      path: `${FRAME_ENDPOINT}/:file`,
      method: "get",
      handler: (req) => {
        const asset = FRAME_ASSETS[req.routeParams?.file as string];
        if (!asset) {
          return new Response("Not found.", { status: 404 });
        }
        return new Response(asset.body, {
          headers: { "Content-Type": asset.type, "Cache-Control": "no-cache" },
        });
      },
    },
  ];
};
