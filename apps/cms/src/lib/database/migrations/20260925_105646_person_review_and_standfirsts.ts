import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Hand-edited after generation:
// - The document_embeddings enum values are left to 20260925_150000, which adds them; adding them
//   here as well would fail on the duplicate, and the generated down would rebuild the enum
//   without them.
// - Turning on drafts gives every existing profile a `draft` status and no version row, which
//   hides it from the site and from the admin list (both read published or latest versions). The
//   backfill at the end of `up` publishes each existing profile and writes the one version row the
//   admin list reads.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_people_directory_markets" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TYPE "public"."enum__page_v_blocks_people_directory_markets" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TYPE "public"."enum_person_contextual_standfirsts_market" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TYPE "public"."enum_person_review_status" AS ENUM('draft', 'submitted', 'changesRequested');
  CREATE TYPE "public"."enum_person_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__person_v_version_markets" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TYPE "public"."enum__person_v_version_contextual_standfirsts_market" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TYPE "public"."enum__person_v_version_review_status" AS ENUM('draft', 'submitted', 'changesRequested');
  CREATE TYPE "public"."enum__person_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__person_v_published_locale" AS ENUM('en', 'fr', 'ja', 'ko', 'zh-hans', 'zh-hant');
  CREATE TYPE "public"."enum_gsec_blocks_people_directory_markets" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TYPE "public"."enum__gsec_v_blocks_people_directory_markets" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TYPE "public"."enum_presets_blocks_people_directory_markets" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TABLE "page_blocks_people_directory_markets" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_page_blocks_people_directory_markets",
  	"locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_page_v_blocks_people_directory_markets" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__page_v_blocks_people_directory_markets",
  	"locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "person_contextual_standfirsts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"service_id" integer,
  	"market" "enum_person_contextual_standfirsts_market"
  );
  
  CREATE TABLE "person_contextual_standfirsts_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "person_locales" (
  	"standfirst" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "person_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"page_id" integer
  );
  
  CREATE TABLE "_person_v_version_markets" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__person_v_version_markets",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_person_v_version_contextual_standfirsts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"service_id" integer,
  	"market" "enum__person_v_version_contextual_standfirsts_market",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_person_v_version_contextual_standfirsts_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_person_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_job_title" varchar,
  	"version_email" varchar,
  	"version_office" varchar,
  	"version_photo_id" integer,
  	"version_biography" varchar,
  	"version_review_status" "enum__person_v_version_review_status",
  	"version_reviewer_note" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__person_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__person_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_person_v_locales" (
  	"version_standfirst" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_person_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"page_id" integer
  );
  
  CREATE TABLE "gsec_blocks_people_directory_markets" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_gsec_blocks_people_directory_markets",
  	"locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_gsec_v_blocks_people_directory_markets" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__gsec_v_blocks_people_directory_markets",
  	"locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "presets_blocks_people_directory_markets" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_presets_blocks_people_directory_markets",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "person" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "person" ALTER COLUMN "job_title" DROP NOT NULL;
  ALTER TABLE "person" ALTER COLUMN "email" DROP NOT NULL;
  ALTER TABLE "page_blocks_people_directory" ADD COLUMN "service_id" integer;
  ALTER TABLE "_page_v_blocks_people_directory" ADD COLUMN "service_id" integer;
  ALTER TABLE "person" ADD COLUMN "review_status" "enum_person_review_status";
  ALTER TABLE "person" ADD COLUMN "reviewer_note" varchar;
  ALTER TABLE "person" ADD COLUMN "_status" "enum_person_status" DEFAULT 'draft';
  ALTER TABLE "gsec_blocks_people_directory" ADD COLUMN "service_id" integer;
  ALTER TABLE "_gsec_v_blocks_people_directory" ADD COLUMN "service_id" integer;
  ALTER TABLE "users" ADD COLUMN "person_id" integer;
  ALTER TABLE "presets_blocks_people_directory" ADD COLUMN "service_id" integer;
  ALTER TABLE "page_blocks_people_directory_markets" ADD CONSTRAINT "page_blocks_people_directory_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."page_blocks_people_directory"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_people_directory_markets" ADD CONSTRAINT "_page_v_blocks_people_directory_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_page_v_blocks_people_directory"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "person_contextual_standfirsts" ADD CONSTRAINT "person_contextual_standfirsts_service_id_page_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."page"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "person_contextual_standfirsts" ADD CONSTRAINT "person_contextual_standfirsts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "person_contextual_standfirsts_locales" ADD CONSTRAINT "person_contextual_standfirsts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."person_contextual_standfirsts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "person_locales" ADD CONSTRAINT "person_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "person_rels" ADD CONSTRAINT "person_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "person_rels" ADD CONSTRAINT "person_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_person_v_version_markets" ADD CONSTRAINT "_person_v_version_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_person_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_person_v_version_contextual_standfirsts" ADD CONSTRAINT "_person_v_version_contextual_standfirsts_service_id_page_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."page"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_person_v_version_contextual_standfirsts" ADD CONSTRAINT "_person_v_version_contextual_standfirsts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_person_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_person_v_version_contextual_standfirsts_locales" ADD CONSTRAINT "_person_v_version_contextual_standfirsts_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_person_v_version_contextual_standfirsts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_person_v" ADD CONSTRAINT "_person_v_parent_id_person_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."person"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_person_v" ADD CONSTRAINT "_person_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_person_v_locales" ADD CONSTRAINT "_person_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_person_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_person_v_rels" ADD CONSTRAINT "_person_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_person_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_person_v_rels" ADD CONSTRAINT "_person_v_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_people_directory_markets" ADD CONSTRAINT "gsec_blocks_people_directory_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."gsec_blocks_people_directory"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_people_directory_markets" ADD CONSTRAINT "_gsec_v_blocks_people_directory_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_gsec_v_blocks_people_directory"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_people_directory_markets" ADD CONSTRAINT "presets_blocks_people_directory_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."presets_blocks_people_directory"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_people_directory_markets_order_idx" ON "page_blocks_people_directory_markets" USING btree ("order");
  CREATE INDEX "page_blocks_people_directory_markets_parent_idx" ON "page_blocks_people_directory_markets" USING btree ("parent_id");
  CREATE INDEX "page_blocks_people_directory_markets_locale_idx" ON "page_blocks_people_directory_markets" USING btree ("locale");
  CREATE INDEX "_page_v_blocks_people_directory_markets_order_idx" ON "_page_v_blocks_people_directory_markets" USING btree ("order");
  CREATE INDEX "_page_v_blocks_people_directory_markets_parent_idx" ON "_page_v_blocks_people_directory_markets" USING btree ("parent_id");
  CREATE INDEX "_page_v_blocks_people_directory_markets_locale_idx" ON "_page_v_blocks_people_directory_markets" USING btree ("locale");
  CREATE INDEX "person_contextual_standfirsts_order_idx" ON "person_contextual_standfirsts" USING btree ("_order");
  CREATE INDEX "person_contextual_standfirsts_parent_id_idx" ON "person_contextual_standfirsts" USING btree ("_parent_id");
  CREATE INDEX "person_contextual_standfirsts_service_idx" ON "person_contextual_standfirsts" USING btree ("service_id");
  CREATE UNIQUE INDEX "person_contextual_standfirsts_locales_locale_parent_id_uniqu" ON "person_contextual_standfirsts_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "person_locales_locale_parent_id_unique" ON "person_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "person_rels_order_idx" ON "person_rels" USING btree ("order");
  CREATE INDEX "person_rels_parent_idx" ON "person_rels" USING btree ("parent_id");
  CREATE INDEX "person_rels_path_idx" ON "person_rels" USING btree ("path");
  CREATE INDEX "person_rels_page_id_idx" ON "person_rels" USING btree ("page_id");
  CREATE INDEX "_person_v_version_markets_order_idx" ON "_person_v_version_markets" USING btree ("order");
  CREATE INDEX "_person_v_version_markets_parent_idx" ON "_person_v_version_markets" USING btree ("parent_id");
  CREATE INDEX "_person_v_version_contextual_standfirsts_order_idx" ON "_person_v_version_contextual_standfirsts" USING btree ("_order");
  CREATE INDEX "_person_v_version_contextual_standfirsts_parent_id_idx" ON "_person_v_version_contextual_standfirsts" USING btree ("_parent_id");
  CREATE INDEX "_person_v_version_contextual_standfirsts_service_idx" ON "_person_v_version_contextual_standfirsts" USING btree ("service_id");
  CREATE UNIQUE INDEX "_person_v_version_contextual_standfirsts_locales_locale_pare" ON "_person_v_version_contextual_standfirsts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_person_v_parent_idx" ON "_person_v" USING btree ("parent_id");
  CREATE INDEX "_person_v_version_version_email_idx" ON "_person_v" USING btree ("version_email");
  CREATE INDEX "_person_v_version_version_photo_idx" ON "_person_v" USING btree ("version_photo_id");
  CREATE INDEX "_person_v_version_version_updated_at_idx" ON "_person_v" USING btree ("version_updated_at");
  CREATE INDEX "_person_v_version_version_created_at_idx" ON "_person_v" USING btree ("version_created_at");
  CREATE INDEX "_person_v_version_version__status_idx" ON "_person_v" USING btree ("version__status");
  CREATE INDEX "_person_v_created_at_idx" ON "_person_v" USING btree ("created_at");
  CREATE INDEX "_person_v_updated_at_idx" ON "_person_v" USING btree ("updated_at");
  CREATE INDEX "_person_v_snapshot_idx" ON "_person_v" USING btree ("snapshot");
  CREATE INDEX "_person_v_published_locale_idx" ON "_person_v" USING btree ("published_locale");
  CREATE INDEX "_person_v_latest_idx" ON "_person_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_person_v_locales_locale_parent_id_unique" ON "_person_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_person_v_rels_order_idx" ON "_person_v_rels" USING btree ("order");
  CREATE INDEX "_person_v_rels_parent_idx" ON "_person_v_rels" USING btree ("parent_id");
  CREATE INDEX "_person_v_rels_path_idx" ON "_person_v_rels" USING btree ("path");
  CREATE INDEX "_person_v_rels_page_id_idx" ON "_person_v_rels" USING btree ("page_id");
  CREATE INDEX "gsec_blocks_people_directory_markets_order_idx" ON "gsec_blocks_people_directory_markets" USING btree ("order");
  CREATE INDEX "gsec_blocks_people_directory_markets_parent_idx" ON "gsec_blocks_people_directory_markets" USING btree ("parent_id");
  CREATE INDEX "gsec_blocks_people_directory_markets_locale_idx" ON "gsec_blocks_people_directory_markets" USING btree ("locale");
  CREATE INDEX "_gsec_v_blocks_people_directory_markets_order_idx" ON "_gsec_v_blocks_people_directory_markets" USING btree ("order");
  CREATE INDEX "_gsec_v_blocks_people_directory_markets_parent_idx" ON "_gsec_v_blocks_people_directory_markets" USING btree ("parent_id");
  CREATE INDEX "_gsec_v_blocks_people_directory_markets_locale_idx" ON "_gsec_v_blocks_people_directory_markets" USING btree ("locale");
  CREATE INDEX "presets_blocks_people_directory_markets_order_idx" ON "presets_blocks_people_directory_markets" USING btree ("order");
  CREATE INDEX "presets_blocks_people_directory_markets_parent_idx" ON "presets_blocks_people_directory_markets" USING btree ("parent_id");
  ALTER TABLE "page_blocks_people_directory" ADD CONSTRAINT "page_blocks_people_directory_service_id_page_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."page"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_people_directory" ADD CONSTRAINT "_page_v_blocks_people_directory_service_id_page_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."page"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_people_directory" ADD CONSTRAINT "gsec_blocks_people_directory_service_id_page_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."page"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_people_directory" ADD CONSTRAINT "_gsec_v_blocks_people_directory_service_id_page_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."page"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_people_directory" ADD CONSTRAINT "presets_blocks_people_directory_service_id_page_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."page"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "page_blocks_people_directory_service_idx" ON "page_blocks_people_directory" USING btree ("service_id");
  CREATE INDEX "_page_v_blocks_people_directory_service_idx" ON "_page_v_blocks_people_directory" USING btree ("service_id");
  CREATE INDEX "person__status_idx" ON "person" USING btree ("_status");
  CREATE INDEX "gsec_blocks_people_directory_service_idx" ON "gsec_blocks_people_directory" USING btree ("service_id");
  CREATE INDEX "_gsec_v_blocks_people_directory_service_idx" ON "_gsec_v_blocks_people_directory" USING btree ("service_id");
  CREATE INDEX "users_person_idx" ON "users" USING btree ("person_id");
  CREATE INDEX "presets_blocks_people_directory_service_idx" ON "presets_blocks_people_directory" USING btree ("service_id");
  UPDATE "person" SET "_status" = 'published';
  INSERT INTO "_person_v" ("parent_id", "version_name", "version_job_title", "version_email", "version_office", "version_photo_id", "version_biography", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest")
    SELECT "id", "name", "job_title", "email", "office", "photo_id", "biography", "updated_at", "created_at", 'published', "updated_at", "updated_at", true FROM "person";
  INSERT INTO "_person_v_version_markets" ("order", "parent_id", "value")
    SELECT "person_markets"."order", "_person_v"."id", "person_markets"."value"::text::"enum__person_v_version_markets"
    FROM "person_markets" JOIN "_person_v" ON "_person_v"."parent_id" = "person_markets"."parent_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_people_directory_markets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_people_directory_markets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "person_contextual_standfirsts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "person_contextual_standfirsts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "person_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "person_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_person_v_version_markets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_person_v_version_contextual_standfirsts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_person_v_version_contextual_standfirsts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_person_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_person_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_person_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_people_directory_markets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_people_directory_markets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_people_directory_markets" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "page_blocks_people_directory_markets" CASCADE;
  DROP TABLE "_page_v_blocks_people_directory_markets" CASCADE;
  DROP TABLE "person_contextual_standfirsts" CASCADE;
  DROP TABLE "person_contextual_standfirsts_locales" CASCADE;
  DROP TABLE "person_locales" CASCADE;
  DROP TABLE "person_rels" CASCADE;
  DROP TABLE "_person_v_version_markets" CASCADE;
  DROP TABLE "_person_v_version_contextual_standfirsts" CASCADE;
  DROP TABLE "_person_v_version_contextual_standfirsts_locales" CASCADE;
  DROP TABLE "_person_v" CASCADE;
  DROP TABLE "_person_v_locales" CASCADE;
  DROP TABLE "_person_v_rels" CASCADE;
  DROP TABLE "gsec_blocks_people_directory_markets" CASCADE;
  DROP TABLE "_gsec_v_blocks_people_directory_markets" CASCADE;
  DROP TABLE "presets_blocks_people_directory_markets" CASCADE;
  ALTER TABLE "page_blocks_people_directory" DROP CONSTRAINT "page_blocks_people_directory_service_id_page_id_fk";
  
  ALTER TABLE "_page_v_blocks_people_directory" DROP CONSTRAINT "_page_v_blocks_people_directory_service_id_page_id_fk";
  
  ALTER TABLE "gsec_blocks_people_directory" DROP CONSTRAINT "gsec_blocks_people_directory_service_id_page_id_fk";
  
  ALTER TABLE "_gsec_v_blocks_people_directory" DROP CONSTRAINT "_gsec_v_blocks_people_directory_service_id_page_id_fk";
  
  ALTER TABLE "users" DROP CONSTRAINT "users_person_id_person_id_fk";
  
  ALTER TABLE "presets_blocks_people_directory" DROP CONSTRAINT "presets_blocks_people_directory_service_id_page_id_fk";
  
  DROP INDEX "page_blocks_people_directory_service_idx";
  DROP INDEX "_page_v_blocks_people_directory_service_idx";
  DROP INDEX "person__status_idx";
  DROP INDEX "gsec_blocks_people_directory_service_idx";
  DROP INDEX "_gsec_v_blocks_people_directory_service_idx";
  DROP INDEX "users_person_idx";
  DROP INDEX "presets_blocks_people_directory_service_idx";
  ALTER TABLE "person" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "person" ALTER COLUMN "job_title" SET NOT NULL;
  ALTER TABLE "person" ALTER COLUMN "email" SET NOT NULL;
  ALTER TABLE "page_blocks_people_directory" DROP COLUMN "service_id";
  ALTER TABLE "_page_v_blocks_people_directory" DROP COLUMN "service_id";
  ALTER TABLE "person" DROP COLUMN "review_status";
  ALTER TABLE "person" DROP COLUMN "reviewer_note";
  ALTER TABLE "person" DROP COLUMN "_status";
  ALTER TABLE "gsec_blocks_people_directory" DROP COLUMN "service_id";
  ALTER TABLE "_gsec_v_blocks_people_directory" DROP COLUMN "service_id";
  ALTER TABLE "users" DROP COLUMN "person_id";
  ALTER TABLE "presets_blocks_people_directory" DROP COLUMN "service_id";
  DROP TYPE "public"."enum_page_blocks_people_directory_markets";
  DROP TYPE "public"."enum__page_v_blocks_people_directory_markets";
  DROP TYPE "public"."enum_person_contextual_standfirsts_market";
  DROP TYPE "public"."enum_person_review_status";
  DROP TYPE "public"."enum_person_status";
  DROP TYPE "public"."enum__person_v_version_markets";
  DROP TYPE "public"."enum__person_v_version_contextual_standfirsts_market";
  DROP TYPE "public"."enum__person_v_version_review_status";
  DROP TYPE "public"."enum__person_v_version_status";
  DROP TYPE "public"."enum__person_v_published_locale";
  DROP TYPE "public"."enum_gsec_blocks_people_directory_markets";
  DROP TYPE "public"."enum__gsec_v_blocks_people_directory_markets";
  DROP TYPE "public"."enum_presets_blocks_people_directory_markets";`)
}
