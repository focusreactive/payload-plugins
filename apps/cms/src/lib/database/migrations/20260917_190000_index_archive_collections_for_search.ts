import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

/**
 * Lets the semantic index hold rows for the two archive collections.
 *
 * Hand-written rather than generated, because `payload migrate:create` emits a whole new enum plus
 * a column swap for what Postgres can do in place, and this table's `embedding vector(1536)` column
 * is invisible to Payload's schema snapshot - a regenerated table definition would drop it.
 *
 * `down` is deliberately a no-op. Postgres has no `ALTER TYPE ... DROP VALUE`, so reversing this
 * means recreating the type and rewriting every column that uses it; a widened enum with no rows
 * using the new values is harmless, where that rewrite is not. Every other migration here
 * round-trips, so this exception is worth stating rather than leaving as an empty function.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_document_embeddings_collection" ADD VALUE IF NOT EXISTS 'talk';
    ALTER TYPE "public"."enum_document_embeddings_collection" ADD VALUE IF NOT EXISTS 'topic';
  `);
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // See the note above: intentionally irreversible.
}
