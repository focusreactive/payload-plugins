import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
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
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ab_experiments_id" integer;
  CREATE INDEX "ab_experiments_manifest_key_idx" ON "ab_experiments" USING btree ("manifest_key");
  CREATE INDEX "ab_experiments_updated_at_idx" ON "ab_experiments" USING btree ("updated_at");
  CREATE INDEX "ab_experiments_created_at_idx" ON "ab_experiments" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ab_experiments_fk" FOREIGN KEY ("ab_experiments_id") REFERENCES "public"."ab_experiments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_ab_experiments_id_idx" ON "payload_locked_documents_rels" USING btree ("ab_experiments_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_ab_experiments_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_ab_experiments_id_idx";
  ALTER TABLE "ab_experiments" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ab_experiments" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ab_experiments_id";`);
}
