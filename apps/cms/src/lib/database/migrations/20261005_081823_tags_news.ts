import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_news_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_news_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum__news_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__news_v_published_locale" AS ENUM('en', 'de', 'ja');
  CREATE TYPE "public"."enum__news_v_version_meta_robots" AS ENUM('index', 'noindex');
  ALTER TABLE "categories" RENAME TO "tags";
  ALTER TABLE "categories_locales" RENAME TO "tags_locales";
  ALTER SEQUENCE "categories_id_seq" RENAME TO "tags_id_seq";
  ALTER SEQUENCE "categories_locales_id_seq" RENAME TO "tags_locales_id_seq";
  ALTER TABLE "tags" RENAME CONSTRAINT "categories_pkey" TO "tags_pkey";
  ALTER TABLE "tags_locales" RENAME CONSTRAINT "categories_locales_pkey" TO "tags_locales_pkey";
  ALTER TABLE "tags_locales" RENAME CONSTRAINT "categories_locales_parent_id_fk" TO "tags_locales_parent_id_fk";
  ALTER INDEX "categories_slug_idx" RENAME TO "tags_slug_idx";
  ALTER INDEX "categories_updated_at_idx" RENAME TO "tags_updated_at_idx";
  ALTER INDEX "categories_created_at_idx" RENAME TO "tags_created_at_idx";
  ALTER INDEX "categories_locales_locale_parent_id_unique" RENAME TO "tags_locales_locale_parent_id_unique";  CREATE TABLE "news" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_news_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "news_locales" (
  	"title" varchar,
  	"excerpt" varchar,
  	"content" jsonb,
  	"markdown" varchar,
  	"meta_title" varchar,
  	"meta_image_id" integer,
  	"meta_description" varchar,
  	"meta_robots" "enum_news_meta_robots" DEFAULT 'index',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_news_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__news_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__news_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_news_v_locales" (
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"version_content" jsonb,
  	"version_markdown" varchar,
  	"version_meta_title" varchar,
  	"version_meta_image_id" integer,
  	"version_meta_description" varchar,
  	"version_meta_robots" "enum__news_v_version_meta_robots" DEFAULT 'index',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  ALTER TABLE "page_blocks_posts_list" DROP CONSTRAINT "page_blocks_posts_list_category_id_categories_id_fk";
  
  ALTER TABLE "_page_v_blocks_posts_list" DROP CONSTRAINT "_page_v_blocks_posts_list_category_id_categories_id_fk";
  
  ALTER TABLE "posts_rels" DROP CONSTRAINT "posts_rels_categories_fk";
  
  ALTER TABLE "_posts_v_rels" DROP CONSTRAINT "_posts_v_rels_categories_fk";
  
  ALTER TABLE "gsec_blocks_posts_list" DROP CONSTRAINT "gsec_blocks_posts_list_category_id_categories_id_fk";
  
  ALTER TABLE "_gsec_v_blocks_posts_list" DROP CONSTRAINT "_gsec_v_blocks_posts_list_category_id_categories_id_fk";
  
  ALTER TABLE "presets_blocks_posts_list" DROP CONSTRAINT "presets_blocks_posts_list_category_id_categories_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_categories_fk";
  
  ALTER TABLE "page_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE text;
  UPDATE "page_blocks_posts_list" SET "source" = 'tag' WHERE "source" = 'category';
  ALTER TABLE "page_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::text;
  DROP TYPE "public"."enum_page_blocks_posts_list_source";
  CREATE TYPE "public"."enum_page_blocks_posts_list_source" AS ENUM('latest', 'tag', 'author');
  ALTER TABLE "page_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::"public"."enum_page_blocks_posts_list_source";
  ALTER TABLE "page_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE "public"."enum_page_blocks_posts_list_source" USING "source"::"public"."enum_page_blocks_posts_list_source";
  ALTER TABLE "_page_v_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE text;
  UPDATE "_page_v_blocks_posts_list" SET "source" = 'tag' WHERE "source" = 'category';
  ALTER TABLE "_page_v_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::text;
  DROP TYPE "public"."enum__page_v_blocks_posts_list_source";
  CREATE TYPE "public"."enum__page_v_blocks_posts_list_source" AS ENUM('latest', 'tag', 'author');
  ALTER TABLE "_page_v_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::"public"."enum__page_v_blocks_posts_list_source";
  ALTER TABLE "_page_v_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE "public"."enum__page_v_blocks_posts_list_source" USING "source"::"public"."enum__page_v_blocks_posts_list_source";
  ALTER TABLE "gsec_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE text;
  UPDATE "gsec_blocks_posts_list" SET "source" = 'tag' WHERE "source" = 'category';
  ALTER TABLE "gsec_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::text;
  DROP TYPE "public"."enum_gsec_blocks_posts_list_source";
  CREATE TYPE "public"."enum_gsec_blocks_posts_list_source" AS ENUM('latest', 'tag', 'author');
  ALTER TABLE "gsec_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::"public"."enum_gsec_blocks_posts_list_source";
  ALTER TABLE "gsec_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE "public"."enum_gsec_blocks_posts_list_source" USING "source"::"public"."enum_gsec_blocks_posts_list_source";
  ALTER TABLE "_gsec_v_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE text;
  UPDATE "_gsec_v_blocks_posts_list" SET "source" = 'tag' WHERE "source" = 'category';
  ALTER TABLE "_gsec_v_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::text;
  DROP TYPE "public"."enum__gsec_v_blocks_posts_list_source";
  CREATE TYPE "public"."enum__gsec_v_blocks_posts_list_source" AS ENUM('latest', 'tag', 'author');
  ALTER TABLE "_gsec_v_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::"public"."enum__gsec_v_blocks_posts_list_source";
  ALTER TABLE "_gsec_v_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE "public"."enum__gsec_v_blocks_posts_list_source" USING "source"::"public"."enum__gsec_v_blocks_posts_list_source";
  ALTER TABLE "presets_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE text;
  UPDATE "presets_blocks_posts_list" SET "source" = 'tag' WHERE "source" = 'category';
  ALTER TABLE "presets_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::text;
  DROP TYPE "public"."enum_presets_blocks_posts_list_source";
  CREATE TYPE "public"."enum_presets_blocks_posts_list_source" AS ENUM('latest', 'tag', 'author');
  ALTER TABLE "presets_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::"public"."enum_presets_blocks_posts_list_source";
  ALTER TABLE "presets_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE "public"."enum_presets_blocks_posts_list_source" USING "source"::"public"."enum_presets_blocks_posts_list_source";
  DROP INDEX "page_blocks_posts_list_category_idx";
  DROP INDEX "_page_v_blocks_posts_list_category_idx";
  DROP INDEX "posts_rels_categories_id_idx";
  DROP INDEX "_posts_v_rels_categories_id_idx";
  DROP INDEX "gsec_blocks_posts_list_category_idx";
  DROP INDEX "_gsec_v_blocks_posts_list_category_idx";
  DROP INDEX "presets_blocks_posts_list_category_idx";
  DROP INDEX "payload_locked_documents_rels_categories_id_idx";
  ALTER TABLE "page_blocks_posts_list" RENAME COLUMN "category_id" TO "tag_id";
  ALTER TABLE "_page_v_blocks_posts_list" RENAME COLUMN "category_id" TO "tag_id";
  ALTER TABLE "posts_rels" RENAME COLUMN "categories_id" TO "tags_id";
  UPDATE "posts_rels" SET "path" = 'tags' WHERE "path" = 'categories';
  ALTER TABLE "_posts_v_rels" RENAME COLUMN "categories_id" TO "tags_id";
  UPDATE "_posts_v_rels" SET "path" = 'version.tags' WHERE "path" = 'version.categories';
  ALTER TABLE "gsec_blocks_posts_list" RENAME COLUMN "category_id" TO "tag_id";
  ALTER TABLE "_gsec_v_blocks_posts_list" RENAME COLUMN "category_id" TO "tag_id";
  ALTER TABLE "presets_blocks_posts_list" RENAME COLUMN "category_id" TO "tag_id";
  ALTER TABLE "payload_mcp_api_keys" RENAME COLUMN "categories_create" TO "tags_create";
  ALTER TABLE "payload_mcp_api_keys" RENAME COLUMN "categories_update" TO "tags_update";
  ALTER TABLE "payload_mcp_api_keys" RENAME COLUMN "categories_delete" TO "tags_delete";
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "news_create" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "news_update" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "news_delete" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" RENAME COLUMN "categories_id" TO "tags_id";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "news_id" integer;
  ALTER TABLE "news_locales" ADD CONSTRAINT "news_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_locales" ADD CONSTRAINT "news_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_parent_id_news_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."news"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_locales" ADD CONSTRAINT "_news_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_locales" ADD CONSTRAINT "_news_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "news_slug_idx" ON "news" USING btree ("slug");
  CREATE INDEX "news_updated_at_idx" ON "news" USING btree ("updated_at");
  CREATE INDEX "news_created_at_idx" ON "news" USING btree ("created_at");
  CREATE INDEX "news__status_idx" ON "news" USING btree ("_status");
  CREATE INDEX "news_meta_meta_image_idx" ON "news_locales" USING btree ("meta_image_id");
  CREATE UNIQUE INDEX "news_locales_locale_parent_id_unique" ON "news_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_news_v_parent_idx" ON "_news_v" USING btree ("parent_id");
  CREATE INDEX "_news_v_version_version_slug_idx" ON "_news_v" USING btree ("version_slug");
  CREATE INDEX "_news_v_version_version_updated_at_idx" ON "_news_v" USING btree ("version_updated_at");
  CREATE INDEX "_news_v_version_version_created_at_idx" ON "_news_v" USING btree ("version_created_at");
  CREATE INDEX "_news_v_version_version__status_idx" ON "_news_v" USING btree ("version__status");
  CREATE INDEX "_news_v_created_at_idx" ON "_news_v" USING btree ("created_at");
  CREATE INDEX "_news_v_updated_at_idx" ON "_news_v" USING btree ("updated_at");
  CREATE INDEX "_news_v_snapshot_idx" ON "_news_v" USING btree ("snapshot");
  CREATE INDEX "_news_v_published_locale_idx" ON "_news_v" USING btree ("published_locale");
  CREATE INDEX "_news_v_latest_idx" ON "_news_v" USING btree ("latest");
  CREATE INDEX "_news_v_version_meta_version_meta_image_idx" ON "_news_v_locales" USING btree ("version_meta_image_id");
  CREATE UNIQUE INDEX "_news_v_locales_locale_parent_id_unique" ON "_news_v_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "page_blocks_posts_list" ADD CONSTRAINT "page_blocks_posts_list_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_posts_list" ADD CONSTRAINT "_page_v_blocks_posts_list_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_posts_list" ADD CONSTRAINT "gsec_blocks_posts_list_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_posts_list" ADD CONSTRAINT "_gsec_v_blocks_posts_list_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_posts_list" ADD CONSTRAINT "presets_blocks_posts_list_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_news_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_posts_list_tag_idx" ON "page_blocks_posts_list" USING btree ("tag_id");
  CREATE INDEX "_page_v_blocks_posts_list_tag_idx" ON "_page_v_blocks_posts_list" USING btree ("tag_id");
  CREATE INDEX "posts_rels_tags_id_idx" ON "posts_rels" USING btree ("tags_id","locale");
  CREATE INDEX "_posts_v_rels_tags_id_idx" ON "_posts_v_rels" USING btree ("tags_id","locale");
  CREATE INDEX "gsec_blocks_posts_list_tag_idx" ON "gsec_blocks_posts_list" USING btree ("tag_id");
  CREATE INDEX "_gsec_v_blocks_posts_list_tag_idx" ON "_gsec_v_blocks_posts_list" USING btree ("tag_id");
  CREATE INDEX "presets_blocks_posts_list_tag_idx" ON "presets_blocks_posts_list" USING btree ("tag_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_news_id_idx" ON "payload_locked_documents_rels" USING btree ("news_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tags" RENAME TO "categories";
  ALTER TABLE "tags_locales" RENAME TO "categories_locales";
  ALTER SEQUENCE "tags_id_seq" RENAME TO "categories_id_seq";
  ALTER SEQUENCE "tags_locales_id_seq" RENAME TO "categories_locales_id_seq";
  ALTER TABLE "categories" RENAME CONSTRAINT "tags_pkey" TO "categories_pkey";
  ALTER TABLE "categories_locales" RENAME CONSTRAINT "tags_locales_pkey" TO "categories_locales_pkey";
  ALTER TABLE "categories_locales" RENAME CONSTRAINT "tags_locales_parent_id_fk" TO "categories_locales_parent_id_fk";
  ALTER INDEX "tags_slug_idx" RENAME TO "categories_slug_idx";
  ALTER INDEX "tags_updated_at_idx" RENAME TO "categories_updated_at_idx";
  ALTER INDEX "tags_created_at_idx" RENAME TO "categories_created_at_idx";
  ALTER INDEX "tags_locales_locale_parent_id_unique" RENAME TO "categories_locales_locale_parent_id_unique";
  ALTER TABLE "news" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "news" CASCADE;
  DROP TABLE "news_locales" CASCADE;
  DROP TABLE "_news_v" CASCADE;
  DROP TABLE "_news_v_locales" CASCADE;
  ALTER TABLE "page_blocks_posts_list" DROP CONSTRAINT "page_blocks_posts_list_tag_id_tags_id_fk";
  
  ALTER TABLE "_page_v_blocks_posts_list" DROP CONSTRAINT "_page_v_blocks_posts_list_tag_id_tags_id_fk";
  
  ALTER TABLE "posts_rels" DROP CONSTRAINT "posts_rels_tags_fk";
  
  ALTER TABLE "_posts_v_rels" DROP CONSTRAINT "_posts_v_rels_tags_fk";
  
  ALTER TABLE "gsec_blocks_posts_list" DROP CONSTRAINT "gsec_blocks_posts_list_tag_id_tags_id_fk";
  
  ALTER TABLE "_gsec_v_blocks_posts_list" DROP CONSTRAINT "_gsec_v_blocks_posts_list_tag_id_tags_id_fk";
  
  ALTER TABLE "presets_blocks_posts_list" DROP CONSTRAINT "presets_blocks_posts_list_tag_id_tags_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tags_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_news_fk";
  
  ALTER TABLE "page_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE text;
  UPDATE "page_blocks_posts_list" SET "source" = 'category' WHERE "source" = 'tag';
  ALTER TABLE "page_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::text;
  DROP TYPE "public"."enum_page_blocks_posts_list_source";
  CREATE TYPE "public"."enum_page_blocks_posts_list_source" AS ENUM('latest', 'category', 'author');
  ALTER TABLE "page_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::"public"."enum_page_blocks_posts_list_source";
  ALTER TABLE "page_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE "public"."enum_page_blocks_posts_list_source" USING "source"::"public"."enum_page_blocks_posts_list_source";
  ALTER TABLE "_page_v_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE text;
  UPDATE "_page_v_blocks_posts_list" SET "source" = 'category' WHERE "source" = 'tag';
  ALTER TABLE "_page_v_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::text;
  DROP TYPE "public"."enum__page_v_blocks_posts_list_source";
  CREATE TYPE "public"."enum__page_v_blocks_posts_list_source" AS ENUM('latest', 'category', 'author');
  ALTER TABLE "_page_v_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::"public"."enum__page_v_blocks_posts_list_source";
  ALTER TABLE "_page_v_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE "public"."enum__page_v_blocks_posts_list_source" USING "source"::"public"."enum__page_v_blocks_posts_list_source";
  ALTER TABLE "gsec_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE text;
  UPDATE "gsec_blocks_posts_list" SET "source" = 'category' WHERE "source" = 'tag';
  ALTER TABLE "gsec_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::text;
  DROP TYPE "public"."enum_gsec_blocks_posts_list_source";
  CREATE TYPE "public"."enum_gsec_blocks_posts_list_source" AS ENUM('latest', 'category', 'author');
  ALTER TABLE "gsec_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::"public"."enum_gsec_blocks_posts_list_source";
  ALTER TABLE "gsec_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE "public"."enum_gsec_blocks_posts_list_source" USING "source"::"public"."enum_gsec_blocks_posts_list_source";
  ALTER TABLE "_gsec_v_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE text;
  UPDATE "_gsec_v_blocks_posts_list" SET "source" = 'category' WHERE "source" = 'tag';
  ALTER TABLE "_gsec_v_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::text;
  DROP TYPE "public"."enum__gsec_v_blocks_posts_list_source";
  CREATE TYPE "public"."enum__gsec_v_blocks_posts_list_source" AS ENUM('latest', 'category', 'author');
  ALTER TABLE "_gsec_v_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::"public"."enum__gsec_v_blocks_posts_list_source";
  ALTER TABLE "_gsec_v_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE "public"."enum__gsec_v_blocks_posts_list_source" USING "source"::"public"."enum__gsec_v_blocks_posts_list_source";
  ALTER TABLE "presets_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE text;
  UPDATE "presets_blocks_posts_list" SET "source" = 'category' WHERE "source" = 'tag';
  ALTER TABLE "presets_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::text;
  DROP TYPE "public"."enum_presets_blocks_posts_list_source";
  CREATE TYPE "public"."enum_presets_blocks_posts_list_source" AS ENUM('latest', 'category', 'author');
  ALTER TABLE "presets_blocks_posts_list" ALTER COLUMN "source" SET DEFAULT 'latest'::"public"."enum_presets_blocks_posts_list_source";
  ALTER TABLE "presets_blocks_posts_list" ALTER COLUMN "source" SET DATA TYPE "public"."enum_presets_blocks_posts_list_source" USING "source"::"public"."enum_presets_blocks_posts_list_source";
  DROP INDEX "page_blocks_posts_list_tag_idx";
  DROP INDEX "_page_v_blocks_posts_list_tag_idx";
  DROP INDEX "posts_rels_tags_id_idx";
  DROP INDEX "_posts_v_rels_tags_id_idx";
  DROP INDEX "gsec_blocks_posts_list_tag_idx";
  DROP INDEX "_gsec_v_blocks_posts_list_tag_idx";
  DROP INDEX "presets_blocks_posts_list_tag_idx";
  DROP INDEX "payload_locked_documents_rels_tags_id_idx";
  DROP INDEX "payload_locked_documents_rels_news_id_idx";
  ALTER TABLE "page_blocks_posts_list" RENAME COLUMN "tag_id" TO "category_id";
  ALTER TABLE "_page_v_blocks_posts_list" RENAME COLUMN "tag_id" TO "category_id";
  ALTER TABLE "posts_rels" RENAME COLUMN "tags_id" TO "categories_id";
  UPDATE "posts_rels" SET "path" = 'categories' WHERE "path" = 'tags';
  ALTER TABLE "_posts_v_rels" RENAME COLUMN "tags_id" TO "categories_id";
  UPDATE "_posts_v_rels" SET "path" = 'version.categories' WHERE "path" = 'version.tags';
  ALTER TABLE "gsec_blocks_posts_list" RENAME COLUMN "tag_id" TO "category_id";
  ALTER TABLE "_gsec_v_blocks_posts_list" RENAME COLUMN "tag_id" TO "category_id";
  ALTER TABLE "presets_blocks_posts_list" RENAME COLUMN "tag_id" TO "category_id";
  ALTER TABLE "payload_mcp_api_keys" RENAME COLUMN "tags_create" TO "categories_create";
  ALTER TABLE "payload_mcp_api_keys" RENAME COLUMN "tags_update" TO "categories_update";
  ALTER TABLE "payload_mcp_api_keys" RENAME COLUMN "tags_delete" TO "categories_delete";
  ALTER TABLE "payload_locked_documents_rels" RENAME COLUMN "tags_id" TO "categories_id";
  ALTER TABLE "page_blocks_posts_list" ADD CONSTRAINT "page_blocks_posts_list_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_posts_list" ADD CONSTRAINT "_page_v_blocks_posts_list_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_posts_list" ADD CONSTRAINT "gsec_blocks_posts_list_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_posts_list" ADD CONSTRAINT "_gsec_v_blocks_posts_list_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_posts_list" ADD CONSTRAINT "presets_blocks_posts_list_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_posts_list_category_idx" ON "page_blocks_posts_list" USING btree ("category_id");
  CREATE INDEX "_page_v_blocks_posts_list_category_idx" ON "_page_v_blocks_posts_list" USING btree ("category_id");
  CREATE INDEX "posts_rels_categories_id_idx" ON "posts_rels" USING btree ("categories_id","locale");
  CREATE INDEX "_posts_v_rels_categories_id_idx" ON "_posts_v_rels" USING btree ("categories_id","locale");
  CREATE INDEX "gsec_blocks_posts_list_category_idx" ON "gsec_blocks_posts_list" USING btree ("category_id");
  CREATE INDEX "_gsec_v_blocks_posts_list_category_idx" ON "_gsec_v_blocks_posts_list" USING btree ("category_id");
  CREATE INDEX "presets_blocks_posts_list_category_idx" ON "presets_blocks_posts_list" USING btree ("category_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "news_create";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "news_update";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "news_delete";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "news_id";
  DROP TYPE "public"."enum_news_status";
  DROP TYPE "public"."enum_news_meta_robots";
  DROP TYPE "public"."enum__news_v_version_status";
  DROP TYPE "public"."enum__news_v_published_locale";
  DROP TYPE "public"."enum__news_v_version_meta_robots";`)
}
