import type {
  Access,
  Block,
  CollectionConfig,
  Field,
  FieldAccess,
  GlobalConfig,
  Payload,
} from "payload";

import { sqliteAdapter } from "@payloadcms/db-sqlite";
import {
  BlocksFeature,
  LinkFeature,
  UploadFeature,
  lexicalEditor,
} from "@payloadcms/richtext-lexical";
import { buildConfig, getPayload } from "payload";

import type { VisualEditingPluginConfig } from "../../src/index";

import { visualEditingPlugin } from "../../src/index";

export const START_TIMEOUT_MS = 60_000;
export const SLOW_READ_MS = 400;
export const SHORT_TIME_LIMIT_MS = 100;

const IN_MEMORY_DATABASE = ":memory:";
const SKIPPED_COLLECTIONS = ["plainAuthors", "documents"];
const EXCLUDED_FIELD_NAMES = ["internal"];

const heroBlock: Block = {
  slug: "hero",
  fields: [
    { name: "heading", type: "text" },
    { name: "picked", type: "relationship", relationTo: "pages" },
    { name: "image", type: "upload", relationTo: "media" },
    { name: "body", type: "richText" },
  ],
};

const calloutBlockWith = (canReadNote: FieldAccess): Block => ({
  slug: "callout",
  fields: [
    { name: "text", type: "text" },
    { name: "image", type: "upload", relationTo: "media" },
    { access: { read: canReadNote }, name: "note", type: "text" },
  ],
});

const quoteBlock: Block = { slug: "quote", fields: [{ name: "quote", type: "text" }] };

const REPLACED_FEATURES = new Set(["link", "upload"]);

const creditField: Field = { name: "credit", type: "relationship", relationTo: "authors" };

const authorFields: Field[] = [
  { name: "name", type: "text" },
  { name: "links", type: "array", fields: [{ name: "label", type: "text" }] },
  { name: "favourite", type: "relationship", relationTo: "pages" },
];

const uploadFields: Field[] = [
  { name: "alt", type: "text" },
  { name: "credits", type: "array", fields: [{ name: "name", type: "text" }] },
];

const pageFields: Field[] = [
  { name: "title", type: "text", localized: true },
  { name: "label", type: "text" },
  { name: "secret", type: "text", hidden: true },
  { name: "reference", type: "text", admin: { readOnly: true } },
  { name: "legacy", type: "text", admin: { disabled: true } },
  { name: "internal", type: "group", fields: [{ name: "label", type: "text" }] },
  { name: "seo", type: "group", fields: [{ name: "description", type: "textarea" }] },
  {
    name: "list",
    type: "array",
    fields: [
      { name: "label", type: "text" },
      { name: "note", type: "richText" },
    ],
  },
  {
    name: "localizedList",
    type: "array",
    localized: true,
    fields: [
      { name: "label", type: "text" },
      { name: "note", type: "richText" },
    ],
  },
  { name: "layout", type: "blocks", blocks: [heroBlock] },
  { name: "sections", type: "blocks", blockReferences: ["quote"], blocks: [] },
  { name: "body", type: "richText" },
  { name: "localizedBody", type: "richText", localized: true },
  { name: "related", type: "relationship", relationTo: "pages" },
  { name: "relatedMany", type: "relationship", relationTo: "pages", hasMany: true },
  { name: "eitherOne", type: "relationship", relationTo: ["pages", "authors"] },
  { name: "eitherMany", type: "relationship", relationTo: ["pages", "authors"], hasMany: true },
  { name: "localizedRelated", type: "relationship", relationTo: "pages", localized: true },
  { name: "plainAuthor", type: "relationship", relationTo: "plainAuthors" },
  { name: "plainAuthors", type: "relationship", relationTo: "plainAuthors", hasMany: true },
  { name: "image", type: "upload", relationTo: "media" },
  { name: "gallery", type: "upload", relationTo: "media", hasMany: true },
  { name: "eitherFile", type: "upload", relationTo: ["media", "documents"] },
  { name: "brochure", type: "upload", relationTo: "documents" },
  { name: "localizedImage", type: "upload", relationTo: "media", localized: true },
];

const settings: GlobalConfig = {
  slug: "settings",
  fields: [
    { name: "siteName", type: "text" },
    { name: "footnote", type: "richText" },
    {
      name: "nav",
      type: "array",
      fields: [
        { name: "label", type: "text" },
        { name: "page", type: "relationship", relationTo: "pages" },
      ],
    },
  ],
};

type ReadPage = (page: Record<string, unknown>) => void;

export type RealPayloadOptions = {
  name: string;
  plugin?: VisualEditingPluginConfig;
  onPageReadBeforeThePlugin?: ReadPage;
  canRead?: Access;
  canReadMedia?: Access;
  canReadGuardedBody?: FieldAccess;
};

const ignoreReadPage: ReadPage = () => undefined;

export async function startRealPayload({
  name,
  canRead,
  canReadGuardedBody,
  canReadMedia,
  onPageReadBeforeThePlugin = ignoreReadPage,
  plugin = {},
}: RealPayloadOptions): Promise<Payload> {
  const access = canRead && { read: canRead };
  const mediaAccess = canReadMedia && { read: canReadMedia };
  const guardedBody: Field[] = canReadGuardedBody
    ? [
        { access: { read: canReadGuardedBody }, name: "guardedBody", type: "richText" },
        { admin: { readOnly: true }, name: "lockedBody", type: "richText" },
        { hidden: true, name: "hiddenBody", type: "richText" },
        {
          editor: lexicalEditor({
            features: ({ defaultFeatures }) => [
              ...defaultFeatures.filter(({ key }) => !REPLACED_FEATURES.has(key)),
              BlocksFeature({ blocks: [calloutBlockWith(canReadGuardedBody)] }),
              LinkFeature({ fields: ({ defaultFields }) => [...defaultFields, creditField] }),
              UploadFeature({ collections: { media: { fields: [creditField] } } }),
            ],
          }),
          name: "story",
          type: "richText",
        },
      ]
    : [];
  const pages: CollectionConfig = {
    slug: "pages",
    access,
    fields: [...pageFields, ...guardedBody],
    hooks: {
      afterRead: [
        ({ doc }) => {
          onPageReadBeforeThePlugin(doc);
          return doc;
        },
      ],
    },
    versions: { drafts: true },
  };
  const config = await buildConfig({
    blocks: [quoteBlock],
    collections: [
      pages,
      { slug: "users", auth: true, fields: [{ name: "bio", type: "richText" }] },
      { slug: "authors", fields: authorFields },
      { slug: "plainAuthors", fields: authorFields },
      {
        slug: "media",
        access: mediaAccess,
        fields: uploadFields,
        upload: { disableLocalStorage: true },
      },
      { slug: "documents", fields: uploadFields, upload: { disableLocalStorage: true } },
    ],
    db: sqliteAdapter({ client: { url: IN_MEMORY_DATABASE } }),
    editor: lexicalEditor(),
    globals: [{ ...settings, access }],
    localization: { defaultLocale: "en", fallback: true, locales: ["en", "de"] },
    plugins: [
      visualEditingPlugin({
        excludeFieldNames: EXCLUDED_FIELD_NAMES,
        skipCollections: SKIPPED_COLLECTIONS,
        ...plugin,
      }),
    ],
    secret: "real-payload-test",
    telemetry: false,
    typescript: { autoGenerate: false },
  });
  return getPayload({ config, key: name });
}

export const richText = (text: string) => ({
  root: {
    children: [
      {
        children: [
          { detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 },
        ],
        direction: null,
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
    ],
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
});

const textFile = (name: string) => ({
  data: Buffer.from(name),
  mimetype: "text/plain",
  name,
  size: name.length,
});

export type Site = { about: string; author: string; contact: string; home: string; photo: string };

export async function seedSite(payload: Payload): Promise<Site> {
  const photo = await payload.create({
    collection: "media",
    data: { alt: "A harbour", credits: [{ name: "Ada" }] },
    file: textFile("harbour.txt"),
  });
  const brochure = await payload.create({
    collection: "documents",
    data: { alt: "Brochure", credits: [{ name: "Bea" }] },
    file: textFile("brochure.txt"),
  });
  const contact = await payload.create({
    collection: "pages",
    data: { list: [{ label: "Phone" }], title: "Contact" },
    draft: true,
  });
  const author = await payload.create({
    collection: "authors",
    data: { favourite: contact.id, links: [{ label: "Blog" }], name: "Ann" },
  });
  const plainAuthor = await payload.create({
    collection: "plainAuthors",
    data: { favourite: contact.id, links: [{ label: "Plain blog" }], name: "Paul" },
  });
  const about = await payload.create({
    collection: "pages",
    data: {
      layout: [{ blockName: "About hero", blockType: "hero", heading: "About us" }],
      plainAuthor: plainAuthor.id,
      related: contact.id,
      title: "About",
    },
    draft: true,
  });
  const home = await payload.create({
    collection: "pages",
    data: {
      body: richText("Body"),
      brochure: brochure.id,
      eitherFile: { relationTo: "media", value: photo.id },
      eitherMany: [
        { relationTo: "authors", value: author.id },
        { relationTo: "pages", value: contact.id },
      ],
      eitherOne: { relationTo: "authors", value: author.id },
      gallery: [photo.id],
      image: photo.id,
      internal: { label: "Internal label" },
      label: "Start",
      legacy: "Legacy text",
      layout: [
        {
          blockName: "Home hero",
          blockType: "hero",
          heading: "Welcome",
          image: photo.id,
          picked: contact.id,
        },
      ],
      list: [{ label: "First" }, { label: "Second" }],
      localizedBody: richText("Localized body"),
      localizedImage: photo.id,
      localizedList: [{ label: "English row" }],
      localizedRelated: contact.id,
      plainAuthor: plainAuthor.id,
      plainAuthors: [plainAuthor.id],
      reference: "REF-1",
      related: about.id,
      relatedMany: [about.id, contact.id],
      secret: "Hidden",
      sections: [{ blockType: "quote", quote: "Well said" }],
      seo: { description: "A description" },
      title: "Home",
    },
    draft: true,
  });
  await payload.update({
    collection: "pages",
    data: { localizedList: [{ label: "German row" }], title: "Start" },
    draft: true,
    id: home.id,
    locale: "de",
  });
  await payload.updateGlobal({
    data: { nav: [{ label: "About", page: about.id }], siteName: "Acme" },
    slug: "settings",
  });

  return {
    about: String(about.id),
    author: String(author.id),
    contact: String(contact.id),
    home: String(home.id),
    photo: String(photo.id),
  };
}
