import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_person_markets" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TYPE "public"."enum_insight_markets" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TABLE "person_markets" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_person_markets",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "person" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"job_title" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"office" varchar,
  	"biography" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "insight_markets" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_insight_markets",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "insight" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"passle_shortcode" varchar NOT NULL,
  	"published_date" timestamp(3) with time zone NOT NULL,
  	"author_id" integer,
  	"unmatched_author_email" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "insight_locales" (
  	"title" varchar NOT NULL,
  	"standfirst" varchar NOT NULL,
  	"body" jsonb NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "person_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "insight_id" integer;
  ALTER TABLE "person_markets" ADD CONSTRAINT "person_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "insight_markets" ADD CONSTRAINT "insight_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."insight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "insight" ADD CONSTRAINT "insight_author_id_person_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."person"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "insight_locales" ADD CONSTRAINT "insight_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."insight"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "person_markets_order_idx" ON "person_markets" USING btree ("order");
  CREATE INDEX "person_markets_parent_idx" ON "person_markets" USING btree ("parent_id");
  CREATE UNIQUE INDEX "person_email_idx" ON "person" USING btree ("email");
  CREATE INDEX "person_updated_at_idx" ON "person" USING btree ("updated_at");
  CREATE INDEX "person_created_at_idx" ON "person" USING btree ("created_at");
  CREATE INDEX "insight_markets_order_idx" ON "insight_markets" USING btree ("order");
  CREATE INDEX "insight_markets_parent_idx" ON "insight_markets" USING btree ("parent_id");
  CREATE UNIQUE INDEX "insight_passle_shortcode_idx" ON "insight" USING btree ("passle_shortcode");
  CREATE INDEX "insight_author_idx" ON "insight" USING btree ("author_id");
  CREATE INDEX "insight_updated_at_idx" ON "insight" USING btree ("updated_at");
  CREATE INDEX "insight_created_at_idx" ON "insight" USING btree ("created_at");
  CREATE UNIQUE INDEX "insight_slug_idx" ON "insight_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "insight_locales_locale_parent_id_unique" ON "insight_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_person_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_insight_fk" FOREIGN KEY ("insight_id") REFERENCES "public"."insight"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_person_id_idx" ON "payload_locked_documents_rels" USING btree ("person_id");
  CREATE INDEX "payload_locked_documents_rels_insight_id_idx" ON "payload_locked_documents_rels" USING btree ("insight_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "person_markets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "person" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "insight_markets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "insight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "insight_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "person_markets" CASCADE;
  DROP TABLE "person" CASCADE;
  DROP TABLE "insight_markets" CASCADE;
  DROP TABLE "insight" CASCADE;
  DROP TABLE "insight_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_person_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_insight_fk";
  
  DROP INDEX "payload_locked_documents_rels_person_id_idx";
  DROP INDEX "payload_locked_documents_rels_insight_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "person_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "insight_id";
  DROP TYPE "public"."enum_person_markets";
  DROP TYPE "public"."enum_insight_markets";`)
}
