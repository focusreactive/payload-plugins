import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE EXTENSION IF NOT EXISTS vector;
  ALTER TABLE "document_embeddings" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
  CREATE UNIQUE INDEX IF NOT EXISTS "document_embeddings_doc_collection_locale_idx" ON "document_embeddings" USING btree ("document_id","collection","locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "document_embeddings_doc_collection_locale_idx";
  ALTER TABLE "document_embeddings" DROP COLUMN IF EXISTS "embedding";`)
}
