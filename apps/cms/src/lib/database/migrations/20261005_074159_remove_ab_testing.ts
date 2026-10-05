import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ab_experiments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "abmanifest" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ab_experiments" CASCADE;
  DROP TABLE "abmanifest" CASCADE;
  ALTER TABLE "page" DROP CONSTRAINT "page__abvariantof_id_page_id_fk";
  
  ALTER TABLE "_page_v" DROP CONSTRAINT "_page_v_version__abvariantof_id_page_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_ab_experiments_fk";
  
  DROP INDEX "page__abvariantof_idx";
  DROP INDEX "_page_v_version_version__abvariantof_idx";
  DROP INDEX "payload_locked_documents_rels_ab_experiments_id_idx";
  ALTER TABLE "page" DROP COLUMN "_abpasspercentage";
  ALTER TABLE "page" DROP COLUMN "_abvariantof_id";
  ALTER TABLE "_page_v" DROP COLUMN "version__abpasspercentage";
  ALTER TABLE "_page_v" DROP COLUMN "version__abvariantof_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ab_experiments_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "ab_experiments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"manifest_key" varchar NOT NULL,
  	"parent_doc_id" varchar NOT NULL,
  	"parent_collection" varchar NOT NULL,
  	"locale" varchar,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "abmanifest" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"manifest" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "page" ADD COLUMN "_abpasspercentage" numeric;
  ALTER TABLE "page" ADD COLUMN "_abvariantof_id" integer;
  ALTER TABLE "_page_v" ADD COLUMN "version__abpasspercentage" numeric;
  ALTER TABLE "_page_v" ADD COLUMN "version__abvariantof_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ab_experiments_id" integer;
  CREATE INDEX "ab_experiments_manifest_key_idx" ON "ab_experiments" USING btree ("manifest_key");
  CREATE INDEX "ab_experiments_updated_at_idx" ON "ab_experiments" USING btree ("updated_at");
  CREATE INDEX "ab_experiments_created_at_idx" ON "ab_experiments" USING btree ("created_at");
  ALTER TABLE "page" ADD CONSTRAINT "page__abvariantof_id_page_id_fk" FOREIGN KEY ("_abvariantof_id") REFERENCES "public"."page"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v" ADD CONSTRAINT "_page_v_version__abvariantof_id_page_id_fk" FOREIGN KEY ("version__abvariantof_id") REFERENCES "public"."page"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ab_experiments_fk" FOREIGN KEY ("ab_experiments_id") REFERENCES "public"."ab_experiments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page__abvariantof_idx" ON "page" USING btree ("_abvariantof_id");
  CREATE INDEX "_page_v_version_version__abvariantof_idx" ON "_page_v" USING btree ("version__abvariantof_id");
  CREATE INDEX "payload_locked_documents_rels_ab_experiments_id_idx" ON "payload_locked_documents_rels" USING btree ("ab_experiments_id");`)
}
