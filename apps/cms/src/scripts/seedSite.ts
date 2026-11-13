/**
 * Loads content into the CMS from JSON files kept outside this repository.
 *
 *   SEED_DIR=/absolute/path/to/parts bun run payload run src/scripts/seedSite.ts
 *
 * Every `*.json` file in SEED_DIR is applied in file-name order. A file lists steps; each step
 * upserts documents of one collection, matched by a unique field, so a second run changes
 * nothing it should not and a later file can add fields to a document an earlier file created.
 *
 * Value tokens a document may hold anywhere in its data:
 *   { "$ref": "clinics:downtown" }   the id of a document, by "<collection>:<match value>"
 *   { "$link": "clinics:downtown" }  the same as a link target: { relationTo, value }
 *
 * Hooks that refresh the Next.js cache cannot run outside the app, so every write disables them.
 * Refresh the deployed site afterwards with POST /api/site/revalidate (see that route).
 */
import fs from "node:fs";
import path from "node:path";

import config from "@payload-config";
import { getPayload } from "payload";
import type { CollectionSlug, Payload, Where } from "payload";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

interface SeedDoc {
  /** The value of the step's match field, for example a slug. */
  match: string;
  /** Fields written in the default locale. Tokens are resolved first. */
  data?: JsonObject;
  /** Localized fields per extra locale, written after the default locale. */
  locales?: Record<string, JsonObject>;
}

interface SeedStep {
  collection: string;
  /** The unique field documents are found by. Defaults to "slug". */
  matchField?: string;
  /** With "first", the step updates the collection's oldest document instead of matching. */
  target?: "first";
  /** Drafts are skipped for collections without versions. Defaults to true. */
  publish?: boolean;
  docs: SeedDoc[];
  /** Page steps only: unpublish every page whose slug is not listed in this step. */
  unpublishOthers?: boolean;
}

interface SeedFile {
  steps: SeedStep[];
}

const DEFAULT_LOCALE = "en";
const seedContext = { disableRevalidate: true };
const idCache = new Map<string, number | string>();

async function findId(payload: Payload, collection: string, field: string, value: string) {
  const cacheKey = `${collection}:${value}`;
  const cached = idCache.get(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  const where: Where = { [field]: { equals: value } };
  const { docs } = await payload.find({
    collection: collection as CollectionSlug,
    depth: 0,
    draft: true,
    limit: 1,
    overrideAccess: true,
    where,
  });
  const id = docs[0]?.id;

  if (id !== undefined) {
    idCache.set(cacheKey, id);
  }

  return id;
}

const matchFields = new Map<string, string>();

async function resolveRef(payload: Payload, token: string): Promise<number | string> {
  const separator = token.indexOf(":");
  const collection = token.slice(0, separator);
  const value = token.slice(separator + 1);
  const id = await findId(payload, collection, matchFields.get(collection) ?? "slug", value);

  if (id === undefined) {
    throw new Error(`Seed reference "${token}" points at a document that does not exist yet.`);
  }

  return id;
}

async function resolveTokens(payload: Payload, value: Json): Promise<Json> {
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => resolveTokens(payload, item)));
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (typeof value.$ref === "string") {
    return resolveRef(payload, value.$ref);
  }

  if (typeof value.$link === "string") {
    const collection = value.$link.slice(0, value.$link.indexOf(":"));

    return { relationTo: collection, value: await resolveRef(payload, value.$link) };
  }

  const entries = await Promise.all(
    Object.entries(value).map(
      async ([key, item]) => [key, await resolveTokens(payload, item)] as const
    )
  );

  return Object.fromEntries(entries);
}

async function applyStep(payload: Payload, step: SeedStep): Promise<void> {
  const collection = step.collection as CollectionSlug;
  const matchField = step.matchField ?? "slug";
  const hasDrafts = Boolean(payload.collections[collection]?.config.versions?.drafts);
  const status = hasDrafts && step.publish !== false ? { _status: "published" } : {};

  matchFields.set(step.collection, matchField);

  for (const doc of step.docs) {
    let id: number | string | undefined;

    if (step.target === "first") {
      const { docs } = await payload.find({
        collection,
        depth: 0,
        draft: true,
        limit: 1,
        overrideAccess: true,
        sort: "createdAt",
      });
      id = docs[0]?.id;
    } else {
      id = await findId(payload, step.collection, matchField, doc.match);
    }

    const data = {
      ...(step.target === "first" ? {} : { [matchField]: doc.match }),
      ...((await resolveTokens(payload, doc.data ?? {})) as JsonObject),
      ...status,
    };

    if (id === undefined) {
      const created = await payload.create({
        collection,
        context: seedContext,
        data: data as never,
        locale: DEFAULT_LOCALE,
        overrideAccess: true,
      });
      id = created.id;
      idCache.set(`${step.collection}:${doc.match}`, id);
      payload.logger.info(`created ${step.collection} ${doc.match}`);
    } else {
      await payload.update({
        collection,
        context: seedContext,
        data: data as never,
        id,
        locale: DEFAULT_LOCALE,
        overrideAccess: true,
      });
      payload.logger.info(`updated ${step.collection} ${doc.match}`);
    }

    for (const [locale, localeData] of Object.entries(doc.locales ?? {})) {
      await payload.update({
        collection,
        context: seedContext,
        data: { ...((await resolveTokens(payload, localeData)) as JsonObject), ...status } as never,
        id,
        locale: locale as never,
        overrideAccess: true,
      });
    }
  }

  if (step.unpublishOthers && step.collection === "page") {
    const keep = step.docs.map((doc) => doc.match);
    const { docs } = await payload.find({
      collection: "page",
      depth: 0,
      limit: 0,
      overrideAccess: true,
      pagination: false,
      where: { and: [{ slug: { not_in: keep } }, { _status: { equals: "published" } }] },
    });

    for (const page of docs) {
      await payload.update({
        collection: "page",
        context: seedContext,
        data: { _status: "draft" },
        id: page.id,
        overrideAccess: true,
      });
      payload.logger.info(`unpublished page ${page.slug}`);
    }
  }
}

async function run(): Promise<void> {
  const seedDir = process.env.SEED_DIR;

  if (!seedDir) {
    throw new Error("Set SEED_DIR to the folder that holds the seed JSON files.");
  }

  const files = fs
    .readdirSync(seedDir)
    .filter((name) => name.endsWith(".json"))
    .toSorted();
  const payload = await getPayload({ config });

  for (const name of files) {
    const file = JSON.parse(fs.readFileSync(path.join(seedDir, name), "utf-8")) as SeedFile;

    payload.logger.info(`seed file ${name}: ${file.steps.length} steps`);

    for (const step of file.steps) {
      await applyStep(payload, step);
    }
  }

  payload.logger.info("seed finished");
  process.exit(0);
}

await run();
