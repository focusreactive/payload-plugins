import type { Access, Payload, PayloadRequest } from "payload";

import { createLocalReq } from "payload";

import type { VisualEditingPluginConfig } from "../../src/index";
import type { Pages } from "./richTextPages";

import { VE_PREVIEW_GRANT_PATH, VE_UNSAVED_RICH_TEXT_PATH } from "../../src/shared/protocol";

import { startRealPayload } from "./realPayload";
import { seedPages } from "./richTextPages";
import { EDITOR, OUTSIDER, signIn } from "./unsavedRichTextRequests";

const SITE_ORIGIN = "https://site.example";

export type Site = {
  payload: Payload;
  pages: Pages;
  editor: Headers;
  outsider: Headers;
  fieldsOfReads: string[][];
};

const everyoneButTheOutsider: Access = ({ req }) => req.user?.email !== OUTSIDER.email;

export const startSite = async (name: string, plugin: VisualEditingPluginConfig): Promise<Site> => {
  const fieldsOfReads: string[][] = [];
  const payload = await startRealPayload({
    canRead: everyoneButTheOutsider,
    name,
    onPageReadBeforeThePlugin: (readPage) => {
      fieldsOfReads.push(Object.keys(readPage));
    },
    plugin,
  });
  const pages = await seedPages(payload);
  const editor = await signIn(payload, EDITOR);
  const outsider = await signIn(payload, OUTSIDER);
  return { editor, fieldsOfReads, outsider, pages, payload };
};

const callEndpoint = async (payload: Payload, path: string, body: unknown, headers?: Headers) => {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Origin", SITE_ORIGIN);
  requestHeaders.set("Content-Type", "application/json");
  const { user } = await payload.auth({ headers: requestHeaders });
  const endpoint = payload.config.endpoints.find((candidate) => candidate.path === path);
  const req = await createLocalReq(
    { req: { headers: requestHeaders } as Partial<PayloadRequest>, user: user ?? undefined },
    payload
  );
  req.text = async () => JSON.stringify(body);
  const response = (await endpoint!.handler(req)) as Response;
  return (await response.json()) as Record<string, unknown>;
};

export const readThroughEndpoint = async ({ editor, payload }: Site, request: object) => {
  const { grant } = await callEndpoint(
    payload,
    VE_PREVIEW_GRANT_PATH,
    (request as { field: object }).field,
    editor
  );
  return (await callEndpoint(payload, VE_UNSAVED_RICH_TEXT_PATH, { grant, request })).value;
};

export const fieldsOfTheLastRead = ({ fieldsOfReads }: Site) => fieldsOfReads.at(-1) ?? [];
