import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_posts_cta_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_posts_cta_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_posts_cta_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__posts_v_version_cta_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__posts_v_version_cta_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__posts_v_version_cta_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TABLE "posts_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "posts_cta_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_posts_cta_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_posts_cta_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum_posts_cta_actions_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "_posts_v_version_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v_version_cta_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__posts_v_version_cta_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__posts_v_version_cta_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum__posts_v_version_cta_actions_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  DROP INDEX "posts_rels_categories_id_idx";
  DROP INDEX "posts_rels_authors_id_idx";
  DROP INDEX "posts_rels_posts_id_idx";
  DROP INDEX "_posts_v_rels_categories_id_idx";
  DROP INDEX "_posts_v_rels_authors_id_idx";
  DROP INDEX "_posts_v_rels_posts_id_idx";
  ALTER TABLE "authors" ADD COLUMN "avatar_id" integer;
  ALTER TABLE "posts_locales" ADD COLUMN "faq_heading" varchar;
  ALTER TABLE "posts_locales" ADD COLUMN "cta_badge" varchar;
  ALTER TABLE "posts_locales" ADD COLUMN "cta_heading" varchar;
  ALTER TABLE "posts_locales" ADD COLUMN "cta_lead" varchar;
  ALTER TABLE "posts_rels" ADD COLUMN "locale" "_locales";
  ALTER TABLE "posts_rels" ADD COLUMN "page_id" integer;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_faq_heading" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_cta_badge" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_cta_heading" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_cta_lead" varchar;
  ALTER TABLE "_posts_v_rels" ADD COLUMN "locale" "_locales";
  ALTER TABLE "_posts_v_rels" ADD COLUMN "page_id" integer;
  ALTER TABLE "site_settings_locales" ADD COLUMN "blog_blog_badge" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "blog_search_placeholder" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_blog_blog_badge" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_blog_search_placeholder" varchar;
  ALTER TABLE "posts_faq_items" ADD CONSTRAINT "posts_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_cta_actions" ADD CONSTRAINT "posts_cta_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_version_faq_items" ADD CONSTRAINT "_posts_v_version_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_version_cta_actions" ADD CONSTRAINT "_posts_v_version_cta_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_faq_items_order_idx" ON "posts_faq_items" USING btree ("_order");
  CREATE INDEX "posts_faq_items_parent_id_idx" ON "posts_faq_items" USING btree ("_parent_id");
  CREATE INDEX "posts_faq_items_locale_idx" ON "posts_faq_items" USING btree ("_locale");
  CREATE INDEX "posts_cta_actions_order_idx" ON "posts_cta_actions" USING btree ("_order");
  CREATE INDEX "posts_cta_actions_parent_id_idx" ON "posts_cta_actions" USING btree ("_parent_id");
  CREATE INDEX "posts_cta_actions_locale_idx" ON "posts_cta_actions" USING btree ("_locale");
  CREATE INDEX "_posts_v_version_faq_items_order_idx" ON "_posts_v_version_faq_items" USING btree ("_order");
  CREATE INDEX "_posts_v_version_faq_items_parent_id_idx" ON "_posts_v_version_faq_items" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_version_faq_items_locale_idx" ON "_posts_v_version_faq_items" USING btree ("_locale");
  CREATE INDEX "_posts_v_version_cta_actions_order_idx" ON "_posts_v_version_cta_actions" USING btree ("_order");
  CREATE INDEX "_posts_v_version_cta_actions_parent_id_idx" ON "_posts_v_version_cta_actions" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_version_cta_actions_locale_idx" ON "_posts_v_version_cta_actions" USING btree ("_locale");
  ALTER TABLE "authors" ADD CONSTRAINT "authors_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "authors_avatar_idx" ON "authors" USING btree ("avatar_id");
  CREATE INDEX "posts_rels_locale_idx" ON "posts_rels" USING btree ("locale");
  CREATE INDEX "posts_rels_page_id_idx" ON "posts_rels" USING btree ("page_id","locale");
  CREATE INDEX "_posts_v_rels_locale_idx" ON "_posts_v_rels" USING btree ("locale");
  CREATE INDEX "_posts_v_rels_page_id_idx" ON "_posts_v_rels" USING btree ("page_id","locale");
  CREATE INDEX "posts_rels_categories_id_idx" ON "posts_rels" USING btree ("categories_id","locale");
  CREATE INDEX "posts_rels_authors_id_idx" ON "posts_rels" USING btree ("authors_id","locale");
  CREATE INDEX "posts_rels_posts_id_idx" ON "posts_rels" USING btree ("posts_id","locale");
  CREATE INDEX "_posts_v_rels_categories_id_idx" ON "_posts_v_rels" USING btree ("categories_id","locale");
  CREATE INDEX "_posts_v_rels_authors_id_idx" ON "_posts_v_rels" USING btree ("authors_id","locale");
  CREATE INDEX "_posts_v_rels_posts_id_idx" ON "_posts_v_rels" USING btree ("posts_id","locale");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_cta_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_version_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_version_cta_actions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "posts_faq_items" CASCADE;
  DROP TABLE "posts_cta_actions" CASCADE;
  DROP TABLE "_posts_v_version_faq_items" CASCADE;
  DROP TABLE "_posts_v_version_cta_actions" CASCADE;
  ALTER TABLE "authors" DROP CONSTRAINT "authors_avatar_id_media_id_fk";
  
  ALTER TABLE "posts_rels" DROP CONSTRAINT "posts_rels_page_fk";
  
  ALTER TABLE "_posts_v_rels" DROP CONSTRAINT "_posts_v_rels_page_fk";
  
  DROP INDEX "authors_avatar_idx";
  DROP INDEX "posts_rels_locale_idx";
  DROP INDEX "posts_rels_page_id_idx";
  DROP INDEX "_posts_v_rels_locale_idx";
  DROP INDEX "_posts_v_rels_page_id_idx";
  DROP INDEX "posts_rels_posts_id_idx";
  DROP INDEX "posts_rels_categories_id_idx";
  DROP INDEX "posts_rels_authors_id_idx";
  DROP INDEX "_posts_v_rels_posts_id_idx";
  DROP INDEX "_posts_v_rels_categories_id_idx";
  DROP INDEX "_posts_v_rels_authors_id_idx";
  CREATE INDEX "posts_rels_posts_id_idx" ON "posts_rels" USING btree ("posts_id");
  CREATE INDEX "posts_rels_categories_id_idx" ON "posts_rels" USING btree ("categories_id");
  CREATE INDEX "posts_rels_authors_id_idx" ON "posts_rels" USING btree ("authors_id");
  CREATE INDEX "_posts_v_rels_posts_id_idx" ON "_posts_v_rels" USING btree ("posts_id");
  CREATE INDEX "_posts_v_rels_categories_id_idx" ON "_posts_v_rels" USING btree ("categories_id");
  CREATE INDEX "_posts_v_rels_authors_id_idx" ON "_posts_v_rels" USING btree ("authors_id");
  ALTER TABLE "authors" DROP COLUMN "avatar_id";
  ALTER TABLE "posts_locales" DROP COLUMN "faq_heading";
  ALTER TABLE "posts_locales" DROP COLUMN "cta_badge";
  ALTER TABLE "posts_locales" DROP COLUMN "cta_heading";
  ALTER TABLE "posts_locales" DROP COLUMN "cta_lead";
  ALTER TABLE "posts_rels" DROP COLUMN "locale";
  ALTER TABLE "posts_rels" DROP COLUMN "page_id";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_faq_heading";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_cta_badge";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_cta_heading";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_cta_lead";
  ALTER TABLE "_posts_v_rels" DROP COLUMN "locale";
  ALTER TABLE "_posts_v_rels" DROP COLUMN "page_id";
  ALTER TABLE "site_settings_locales" DROP COLUMN "blog_blog_badge";
  ALTER TABLE "site_settings_locales" DROP COLUMN "blog_search_placeholder";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_blog_blog_badge";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_blog_search_placeholder";
  DROP TYPE "public"."enum_posts_cta_actions_type";
  DROP TYPE "public"."enum_posts_cta_actions_custom_page";
  DROP TYPE "public"."enum_posts_cta_actions_appearance";
  DROP TYPE "public"."enum__posts_v_version_cta_actions_type";
  DROP TYPE "public"."enum__posts_v_version_cta_actions_custom_page";
  DROP TYPE "public"."enum__posts_v_version_cta_actions_appearance";`);
}
