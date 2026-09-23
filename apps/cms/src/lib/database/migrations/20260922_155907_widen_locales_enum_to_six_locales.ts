import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `src/lib/config/i18n.ts` moved the sandbox from the stock en/es pair to six
 * locales (en, fr, ja, ko, zh-hans, zh-hant), but that config change never
 * reached Postgres: every `_locale` / `published_locale` column is backed by
 * a fixed enum type, so writing 'fr' (or any of the other four) fails with
 * `invalid input value for enum _locales` until the enum is widened. This
 * migration was missing entirely - the six-locale config landed without one.
 *
 * `payload migrate:create` auto-generates this as a DROP TYPE / CREATE TYPE
 * rebuild that omits 'es' (it diffs against the current config, which no
 * longer lists 'es'). That rebuild casts every existing row through
 * `USING "_locale"::"public"."_locales"`, which throws the moment a single
 * row still carries 'es' - and this branch's database was copied from a
 * parent that used the stock en/es locales, so it does. Hand-edited to
 * ADD VALUE only: it keeps 'es' as an unused value in the enum rather than
 * risk the cast, which is the safe trade for a demo branch on a deadline.
 *
 * Forward-only: Postgres has no `ALTER TYPE ... DROP VALUE`, so removing
 * 'es' later means the full rebuild above, done only after every 'es' row
 * has been migrated or deleted. `down` is a no-op for the same reason - an
 * enum value, once added, cannot be cleanly un-added.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'fr';
    ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'ja';
    ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'ko';
    ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'zh-hans';
    ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'zh-hant';
    ALTER TYPE "public"."enum__page_v_published_locale" ADD VALUE IF NOT EXISTS 'fr';
    ALTER TYPE "public"."enum__page_v_published_locale" ADD VALUE IF NOT EXISTS 'ja';
    ALTER TYPE "public"."enum__page_v_published_locale" ADD VALUE IF NOT EXISTS 'ko';
    ALTER TYPE "public"."enum__page_v_published_locale" ADD VALUE IF NOT EXISTS 'zh-hans';
    ALTER TYPE "public"."enum__page_v_published_locale" ADD VALUE IF NOT EXISTS 'zh-hant';
    ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'fr';
    ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'ja';
    ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'ko';
    ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'zh-hans';
    ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'zh-hant';
    ALTER TYPE "public"."enum__header_v_published_locale" ADD VALUE IF NOT EXISTS 'fr';
    ALTER TYPE "public"."enum__header_v_published_locale" ADD VALUE IF NOT EXISTS 'ja';
    ALTER TYPE "public"."enum__header_v_published_locale" ADD VALUE IF NOT EXISTS 'ko';
    ALTER TYPE "public"."enum__header_v_published_locale" ADD VALUE IF NOT EXISTS 'zh-hans';
    ALTER TYPE "public"."enum__header_v_published_locale" ADD VALUE IF NOT EXISTS 'zh-hant';
    ALTER TYPE "public"."enum__footer_v_published_locale" ADD VALUE IF NOT EXISTS 'fr';
    ALTER TYPE "public"."enum__footer_v_published_locale" ADD VALUE IF NOT EXISTS 'ja';
    ALTER TYPE "public"."enum__footer_v_published_locale" ADD VALUE IF NOT EXISTS 'ko';
    ALTER TYPE "public"."enum__footer_v_published_locale" ADD VALUE IF NOT EXISTS 'zh-hans';
    ALTER TYPE "public"."enum__footer_v_published_locale" ADD VALUE IF NOT EXISTS 'zh-hant';
    ALTER TYPE "public"."enum__gsec_v_published_locale" ADD VALUE IF NOT EXISTS 'fr';
    ALTER TYPE "public"."enum__gsec_v_published_locale" ADD VALUE IF NOT EXISTS 'ja';
    ALTER TYPE "public"."enum__gsec_v_published_locale" ADD VALUE IF NOT EXISTS 'ko';
    ALTER TYPE "public"."enum__gsec_v_published_locale" ADD VALUE IF NOT EXISTS 'zh-hans';
    ALTER TYPE "public"."enum__gsec_v_published_locale" ADD VALUE IF NOT EXISTS 'zh-hant';
    ALTER TYPE "public"."enum__site_settings_v_published_locale" ADD VALUE IF NOT EXISTS 'fr';
    ALTER TYPE "public"."enum__site_settings_v_published_locale" ADD VALUE IF NOT EXISTS 'ja';
    ALTER TYPE "public"."enum__site_settings_v_published_locale" ADD VALUE IF NOT EXISTS 'ko';
    ALTER TYPE "public"."enum__site_settings_v_published_locale" ADD VALUE IF NOT EXISTS 'zh-hans';
    ALTER TYPE "public"."enum__site_settings_v_published_locale" ADD VALUE IF NOT EXISTS 'zh-hant';
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // See the file header: Postgres cannot drop an enum value, so there is
  // nothing safe to do here once this migration has run.
}
