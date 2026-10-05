import type { FieldHook } from "payload";
import { CONFIG_KEY } from "../config.js";
import type { JsonFormClientConfig } from "../config.js";
import { flatten, uploadUrls } from "./typedJson.js";

// A url can hold a stray `%`, which `decodeURIComponent` throws on.
const fileOf = (url: string) => {
  const name = url.split("/").pop()?.split("?")[0] ?? "";
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

// The upload kind stores a url and nothing else, so on its own it hands a template a string — no
// alt, no size, nothing the file knows about itself. Here it is looked up the way the admin's own
// input does it, by filename, and comes back as the document, the way a real upload field reads.
// One query per document, whatever the json holds; a url that matches no file stays a string, which
// is what a url pasted from somewhere else is.
const resolver = async (urls: string[], req: Parameters<FieldHook>[0]["req"]) => {
  const custom = req.payload?.config?.admin?.custom?.[CONFIG_KEY] as
    | JsonFormClientConfig
    | undefined;
  const collection = custom?.uploads;
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

// Everything outside the app reads plain values, so a site reads `settings.hero.title` by key in
// any language. Everything inside keeps the typed shape, and that is not a preference: the admin
// draws the form from the types, and a script that read flat values and wrote the document back
// would erase the shape. A session is what tells them apart — the admin always has one, a build or
// a frontend arriving over HTTP does not.
export const flattenTypedJson: FieldHook = async ({ req, value }) => {
  if (req.payloadAPI === "local" || req.user) return value;
  return flatten(value, await resolver(uploadUrls(value), req));
};
