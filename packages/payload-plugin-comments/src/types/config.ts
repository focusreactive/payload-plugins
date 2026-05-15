import type { CollectionConfig, Field } from "payload";

import type { Translations } from "../translations/types";

/**
 * Specify which field is used as the document title in the comments UI.
 * @example
 * {
 *   slug: "pages",
 *   titleField: "title"
 * }
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
  /** Set to `false` to disable the plugin entirely.
   * @default false
   */
  enabled?: boolean;
  /**
   * List of collection config objects to tune collection document comments. In any way all collections have comments.
   */
  collections?: CollectionEntry[];
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
  /**
   * Dot-notation path to the field on the users collection used as the
   * display name in the comments UI.
   * @default "name"
   * @example "firstName"
   * @example "profile.displayName"
   */
  usernameFieldPath?: string;
}

export interface CommentsPluginConfigStorage {
  collections?: string[];
  documentTitleFields?: Record<string, string>;
  globals?: string[];
  tenant?: TenantPluginConfig;
  usernameFieldPath?: string;
}
