import type { CollectionConfig, Field, Payload } from "payload";
import type { Translations } from "./translations/types";

export interface BaseServiceOptions {
  payload?: Payload;
  locale?: string | null;
}

export type FieldLabelSegment = { type: "field"; label: string } | { type: "row"; id: string; position: number };

export type GlobalFieldLabelRegistry = Record<string, Record<number, Record<string, FieldLabelSegment[]>>>;

/**
 * Specify which field is used as the document title in the comments UI.
 *
 * @example
 * { slug: "pages", titleField: "title" }
 */
export interface CollectionEntry {
  slug: string;
  /** @default "id" */
  titleField?: string;
}

/**
 * Multi-tenancy configuration for the comments plugin.
 *
 * When enabled, comments are scoped to the current tenant so that users
 * from different tenants cannot see each other's comments.
 */
export interface TenantPluginConfig {
  /** Whether multi-tenancy support is active.
   * @default false
   */
  enabled?: boolean;
  /**
   * Slug of the Payload collection that represents tenants.
   * @default "tenants"
   */
  collectionSlug?: string;
  /**
   * Name of the relationship field on each document collection that holds
   * the tenant reference. This field is used to filter comments by tenant.
   * @default "tenant"
   */
  documentTenantField?: string;
}

/**
 * Configuration options for the `commentsPlugin`.
 *
 * Pass this object to the plugin factory to customise which collections
 * support comments, enable multi-tenancy, and override the generated
 * `comments` collection.
 *
 * @example
 * commentsPlugin({
 *   collections: [
 *     {
 *       slug: "pages",
 *       titleField: "title"
 *     }
 *   ],
 *   tenant: {
 *     enabled: true,
 *     collectionSlug: "tenants",
 *     documentTenantField: "tenant"
 *   },
 * })
 */
export interface CommentsPluginConfig {
  /**
   * List of collection slugs (or detailed config objects) whose documents
   * should support comments. Each entry creates a comments sidebar for
   * documents inside that collection.
   *
   * By default, all collections have comments.
   */
  collections?: CollectionEntry[];
  /** Set to `false` to disable the plugin entirely.
   * @default false
   */
  enabled?: boolean;
  /** Optional multi-tenancy settings. Omit if your project is single-tenant. */
  tenant?: TenantPluginConfig;
  /**
   * Fine-grained overrides for the generated `comments` collection.
   *
   * - `access` / `admin` / `hooks` – merged directly into the collection config.
   * - `fields` – receives the default field array and must return the final
   *   array, allowing you to add, remove, or reorder fields.
   */
  overrides?: Partial<Pick<CollectionConfig, "access" | "admin" | "hooks">> & {
    fields?: (defaultFields: Field[]) => Field[];
  };
  /**
   * Translations for the comments UI per locale.
   *
   * The key is the locale code (e.g. `"en"`, `"fr"`, `"de"`).
   * The value is a partial object matching the comments translation namespace —
   * any keys you omit will fall back to the built-in English strings.
   *
   * @example
   * translations: {
   *   fr: {
   *     label: "Commentaires",
   *     add: "Ajouter un commentaire",
   *     filterOpen: "Ouverts",
   *     filterResolved: "Résolus",
   *     filterMentioned: "Me mentionnent",
   *   }
   * }
   */
  translations?: Translations;
}

export type NormalizedCollectionConfig = Map<string, { titleField: string }>;

export type CommentsPluginConfigOverrides = CommentsPluginConfig["overrides"];

export interface MentionUser {
  id: number;
  name: string;
}

export interface CommentsPluginConfigStorage {
  collections?: string[];
  documentTitleFields?: Record<string, string>;
  tenant?: TenantPluginConfig;
}

export type DocumentTitles = Record<string, Record<string, string>>;

export type CollectionLabels = Record<string, string | Record<string, string>>;

export type FieldPathsMap = Map<string, Map<number, Set<string>>>;

export type Mode = "document" | "global" | "create";

export type FilterMode = "open" | "resolved" | "mentioned";

export interface BaseDocument {
  id: string | number;
  [key: string]: unknown;
}

export type LoadingStatus = "idle" | "loading" | "error" | "success";

export interface User {
  id: number;
  name?: string | null;
  email?: string | null;
}

export interface CommentMention {
  id: string | number | null;
  user: number | User;
}

export interface Comment {
  id: number;
  documentId: number;
  collectionSlug: string;
  fieldPath?: string | null;
  locale?: string | null;
  text: string;
  mentions?: CommentMention[] | null;
  author: number | User;
  isResolved: boolean;
  resolvedBy?: number | User | null;
  resolvedAt?: string | null;
  tenant?: number | string | null;
  createdAt: string;
  updatedAt: string;
}

export type Response<T> = { success: true; data: T } | { success: false; error: string };
