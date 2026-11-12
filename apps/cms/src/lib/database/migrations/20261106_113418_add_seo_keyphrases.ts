import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "seo_keyphrases" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"doc_collection" varchar NOT NULL,
  	"doc_id" varchar NOT NULL,
  	"locale" varchar NOT NULL,
  	"keyphrases" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "seo_keyphrases_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "comments" ALTER COLUMN "author_id" DROP NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "seo_keyphrases_id" integer;
  ALTER TABLE "seo_keyphrases_texts" ADD CONSTRAINT "seo_keyphrases_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."seo_keyphrases"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "seo_keyphrases_updated_at_idx" ON "seo_keyphrases" USING btree ("updated_at");
  CREATE INDEX "seo_keyphrases_created_at_idx" ON "seo_keyphrases" USING btree ("created_at");
  CREATE UNIQUE INDEX "docCollection_docId_locale_idx" ON "seo_keyphrases" USING btree ("doc_collection","doc_id","locale");
  CREATE INDEX "seo_keyphrases_texts_order_parent" ON "seo_keyphrases_texts" USING btree ("order","parent_id");
  CREATE INDEX "seo_keyphrases_texts_text_idx" ON "seo_keyphrases_texts" USING btree ("text");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_seo_keyphrases_fk" FOREIGN KEY ("seo_keyphrases_id") REFERENCES "public"."seo_keyphrases"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_seo_keyphrases_id_idx" ON "payload_locked_documents_rels" USING btree ("seo_keyphrases_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "seo_keyphrases" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "seo_keyphrases_texts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "seo_keyphrases" CASCADE;
  DROP TABLE "seo_keyphrases_texts" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_seo_keyphrases_fk";
  
  DROP INDEX "payload_locked_documents_rels_seo_keyphrases_id_idx";
  ALTER TABLE "comments" ALTER COLUMN "author_id" SET NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "seo_keyphrases_id";`)
}
