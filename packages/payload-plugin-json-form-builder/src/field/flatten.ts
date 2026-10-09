import type { FieldHook } from "payload";
import { CONFIG_KEY } from "../config.js";
import type { JsonFormClientConfig } from "../config.js";
import { follows, reconcile } from "../library/reconcileSection.js";
import { isShaped, shaped } from "./shaped.js";
import { flatten, uploadUrls } from "./typedJson.js";

type Req = Parameters<FieldHook>[0]["req"];

const ownConfig = (req: Req) =>
  req.payload?.config?.admin?.custom?.[CONFIG_KEY] as JsonFormClientConfig | undefined;

// A url can hold a stray `%`, which `decodeURIComponent` throws on.
const fileOf = (url: string) => {
  const name = url.split("/").pop()?.split("?")[0] ?? "";
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

const resolver = async (urls: string[], req: Req) => {
  const collection = ownConfig(req)?.uploads;
  if (!collection || urls.length === 0) return undefined;

  const names = [...new Set(urls.map(fileOf).filter(Boolean))];
  if (names.length === 0) return undefined;

  const { docs } = await req.payload.find({
    collection,
    depth: 0,
    limit: names.length,
    pagination: false,
    req,
    where: { filename: { in: names } },
  });

  const byName = new Map(docs.map((doc) => [(doc as { filename?: string }).filename, doc]));
  return (url: string) => byName.get(fileOf(url)) ?? url;
};

const LIBRARY = Symbol.for("jsonFormBuilder.library");

const library = async (req: Req) => {
  const at = ownConfig(req)?.library;
  if (!at) return undefined;

  const held = req as unknown as Record<symbol, unknown>;
  if (LIBRARY in held) return held[LIBRARY];

  const doc = (await req.payload.findGlobal({ slug: at.global, depth: 0, req })) as Record<
    string,
    unknown
  >;
  held[LIBRARY] = doc?.[at.field] ?? null;
  return held[LIBRARY];
};

// Typed inside the app, plain values outside: the admin draws the form from the types, and a
// script that read flat values and wrote the document back would erase the shape. A session is
// what tells them apart.
export const flattenTypedJson: FieldHook = async ({ req, value }) => {
  const held = follows(value) ? reconcile(value, await library(req)) : value;
  const own = isShaped(held) ? shaped(held, ownConfig(req)?.shapes ?? {}) : held;
  if (req.payloadAPI === "local" || req.user) return own;
  return flatten(own, await resolver(uploadUrls(own), req));
};
