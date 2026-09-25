import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The `collection` select on DocumentEmbeddings (src/collections/DocumentEmbeddings/index.ts)
 * grew three options - insight, person, service - so semantic search can cover articles, people
 * and service pages, not just page/post. The enum backing that column in Postgres is fixed at
 * creation, so the new option values need adding here the same way
 * 20260922_155907_widen_locales_enum_to_six_locales.ts widened the locale enum. Hand-written
 * rather than `payload migrate:create`, the same way 20260619_011448_add_pgvector_embedding_column.ts
 * was (no .json schema snapshot alongside it either): this branch's shared preview database may be
 * mid-edit from other concurrent work, and diffing against it live risks picking up an unrelated
 * in-flight change.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_document_embeddings_collection" ADD VALUE IF NOT EXISTS 'insight';
   ALTER TYPE "public"."enum_document_embeddings_collection" ADD VALUE IF NOT EXISTS 'person';
   ALTER TYPE "public"."enum_document_embeddings_collection" ADD VALUE IF NOT EXISTS 'service';
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Postgres has no `ALTER TYPE ... DROP VALUE`, so there is nothing safe to undo here - same
  // rationale as 20260922_155907_widen_locales_enum_to_six_locales.ts.
}
