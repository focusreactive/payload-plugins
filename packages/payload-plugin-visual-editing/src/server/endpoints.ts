import type { Endpoint, PayloadRequest } from "payload";

import type { LiveRichTextField } from "../shared/protocol.js";
import type { UnsavedRichTextDepth } from "./unsavedRichText/readAsUser.js";

import { readUnsavedRichTextFor } from "../readUnsavedRichText.js";
import { bodyOf, json } from "./endpointJson.js";
import { fieldEditEndpoint } from "./fieldEdit/fieldEditEndpoint.js";
import { mediaOptionsEndpoint } from "./fieldEdit/mediaOptionsEndpoint.js";
import { isPlainObject } from "../shared/plainObject.js";
import { VE_PREVIEW_GRANT_PATH, VE_UNSAVED_RICH_TEXT_PATH } from "../shared/protocol.js";
import { documentAddressOf, isVeDocument, veDocumentOf } from "../shared/veDocument.js";
import { PREVIEW_GRANT_TTL_MS, readPreviewGrant, signPreviewGrant } from "./previewGrant.js";

export type RenderHtml = (args: {
  value: unknown;
  field: LiveRichTextField;
  locale: string | undefined;
  req: PayloadRequest;
}) => string | Promise<string>;

export type UnsavedRichTextEndpointOptions = {
  depth?: UnsavedRichTextDepth;
  inlineEditing?: boolean;
  readWholeDocument?: boolean;
  renderHtml?: RenderHtml;
};

export const ENDPOINT_READ_TIME_LIMIT_MS = 8000;
const HTML_FORMAT = "html";

const jsonToAnyOrigin = (body: unknown, status: number, req: PayloadRequest): Response => {
  const origin = req.headers.get("Origin");
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin" });
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return Response.json(body, { headers, status });
};

const grantEndpoint: Endpoint = {
  handler: async (req) => {
    const { user } = req;
    if (!user) return json({ grant: null }, 401);
    const body = await bodyOf(req);
    if (!isPlainObject(body) || !isVeDocument(body)) return json({ grant: null }, 400);

    const expiresAt = Date.now() + PREVIEW_GRANT_TTL_MS;
    const grant = signPreviewGrant(
      {
        document: documentAddressOf(veDocumentOf(body)),
        expiresAt,
        userCollection: user.collection,
        userId: user.id,
      },
      req.payload.secret
    );
    return json({ expiresAt, grant }, 200);
  },
  method: "post",
  path: VE_PREVIEW_GRANT_PATH,
};

const grantedUserOf = async (req: PayloadRequest, token: unknown) => {
  const grant = readPreviewGrant(token, req.payload.secret, Date.now());
  if (!grant) return null;
  const auth = req.payload.collections[grant.userCollection]?.config.auth;
  if (!auth) return null;
  const user = await req.payload.findByID({
    collection: grant.userCollection,
    depth: auth.depth,
    disableErrors: true,
    id: grant.userId,
    overrideAccess: true,
  });
  return user
    ? { document: grant.document, user: { ...user, collection: grant.userCollection } }
    : null;
};

const unsavedRichTextEndpoint = ({
  depth,
  readWholeDocument,
  renderHtml,
}: Omit<UnsavedRichTextEndpointOptions, "inlineEditing">): Endpoint => ({
  handler: async (req) => {
    const body = await bodyOf(req);
    if (!isPlainObject(body)) return jsonToAnyOrigin({ value: null }, 400, req);

    const granted = await grantedUserOf(req, body.grant);
    if (!granted) return jsonToAnyOrigin({ value: null }, 401, req);

    const value = await readUnsavedRichTextFor({
      allows: ({ field }) => documentAddressOf(field) === granted.document,
      depth,
      payload: req.payload,
      readWholeDocument,
      request: body.request,
      timeLimitMs: ENDPOINT_READ_TIME_LIMIT_MS,
      user: granted.user as Parameters<typeof readUnsavedRichTextFor>[0]["user"],
    });
    if (body.format !== HTML_FORMAT) return jsonToAnyOrigin({ value }, 200, req);
    if (value === null || !renderHtml || !isPlainObject(body.request)) {
      return jsonToAnyOrigin({ html: null }, 200, req);
    }

    const request = body.request as { field: LiveRichTextField; locale?: string };
    req.user = granted.user as PayloadRequest["user"];
    const html = await renderHtml({ field: request.field, locale: request.locale, req, value });
    return jsonToAnyOrigin({ html }, 200, req);
  },
  method: "post",
  path: VE_UNSAVED_RICH_TEXT_PATH,
});

export const visualEditingEndpoints = ({
  inlineEditing,
  ...options
}: UnsavedRichTextEndpointOptions): Endpoint[] => [
  grantEndpoint,
  unsavedRichTextEndpoint(options),
  ...(inlineEditing ? [fieldEditEndpoint, mediaOptionsEndpoint] : []),
];
