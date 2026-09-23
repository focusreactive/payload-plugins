import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Localizes `page.slug` and `posts.slug` (see `lib/fields/slugField.ts`) so
 * every path segment can differ per locale, e.g. "japan" (en) vs "日本" (ja)
 * for the same document.
 *
 * `payload migrate:create` also generated a DROP TABLE for `payload_jobs`
 * and `payload_jobs_log` plus their enum types - that is unrelated
 * environment drift, not part of this change: the scheduling plugin
 * disables itself (and stops declaring the jobs-queue schema) whenever
 * `CRON_SECRET` is unset, which it was in the shell this migration was
 * generated from. Hand-edited out, because shipping it would drop a live
 * jobs queue in any environment where that secret happens to be unset at
 * migrate-time. Re-run `migrate:create` with `CRON_SECRET` set to confirm
 * there is no other pending drift before this merges.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "page_slug_idx";
  DROP INDEX "_page_v_version_version_slug_idx";
  DROP INDEX "posts_slug_idx";
  DROP INDEX "_posts_v_version_version_slug_idx";
  ALTER TABLE "page_locales" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "page_locales" ADD COLUMN "slug" varchar;
  ALTER TABLE "_page_v_locales" ADD COLUMN "version_generate_slug" boolean DEFAULT true;
  ALTER TABLE "_page_v_locales" ADD COLUMN "version_slug" varchar;
  ALTER TABLE "posts_locales" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "posts_locales" ADD COLUMN "slug" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_generate_slug" boolean DEFAULT true;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_slug" varchar;
  CREATE UNIQUE INDEX "page_slug_idx" ON "page_locales" USING btree ("slug","_locale");
  CREATE INDEX "_page_v_version_version_slug_idx" ON "_page_v_locales" USING btree ("version_slug","_locale");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts_locales" USING btree ("slug","_locale");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v_locales" USING btree ("version_slug","_locale");
  ALTER TABLE "page" DROP COLUMN "generate_slug";
  ALTER TABLE "page" DROP COLUMN "slug";
  ALTER TABLE "_page_v" DROP COLUMN "version_generate_slug";
  ALTER TABLE "_page_v" DROP COLUMN "version_slug";
  ALTER TABLE "posts" DROP COLUMN "generate_slug";
  ALTER TABLE "posts" DROP COLUMN "slug";
  ALTER TABLE "_posts_v" DROP COLUMN "version_generate_slug";
  ALTER TABLE "_posts_v" DROP COLUMN "version_slug";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "page_slug_idx";
  DROP INDEX "_page_v_version_version_slug_idx";
  DROP INDEX "posts_slug_idx";
  DROP INDEX "_posts_v_version_version_slug_idx";
  ALTER TABLE "page" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "page" ADD COLUMN "slug" varchar;
  ALTER TABLE "_page_v" ADD COLUMN "version_generate_slug" boolean DEFAULT true;
  ALTER TABLE "_page_v" ADD COLUMN "version_slug" varchar;
  ALTER TABLE "posts" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "posts" ADD COLUMN "slug" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_generate_slug" boolean DEFAULT true;
  ALTER TABLE "_posts_v" ADD COLUMN "version_slug" varchar;
  CREATE UNIQUE INDEX "page_slug_idx" ON "page" USING btree ("slug");
  CREATE INDEX "_page_v_version_version_slug_idx" ON "_page_v" USING btree ("version_slug");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  ALTER TABLE "page_locales" DROP COLUMN "generate_slug";
  ALTER TABLE "page_locales" DROP COLUMN "slug";
  ALTER TABLE "_page_v_locales" DROP COLUMN "version_generate_slug";
  ALTER TABLE "_page_v_locales" DROP COLUMN "version_slug";
  ALTER TABLE "posts_locales" DROP COLUMN "generate_slug";
  ALTER TABLE "posts_locales" DROP COLUMN "slug";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_generate_slug";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_slug";`)
}
