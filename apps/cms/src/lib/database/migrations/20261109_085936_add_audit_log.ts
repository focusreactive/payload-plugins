import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_audit_events_status" AS ENUM('success', 'failure');
  CREATE TYPE "public"."enum_audit_events_actor_type" AS ENUM('user', 'api_key', 'agent', 'system', 'anonymous');
  CREATE TYPE "public"."enum_audit_events_actor_source" AS ENUM('context', 'als', 'auth', 'inferred', 'plugin');
  CREATE TYPE "public"."enum_audit_events_via" AS ENUM('admin', 'rest', 'graphql', 'local', 'mcp', 'job');
  CREATE TYPE "public"."enum_audit_events_target_kind" AS ENUM('collection', 'global', 'auth', 'audit', 'system');
  CREATE TABLE "audit_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"occurred_at" timestamp(3) with time zone NOT NULL,
  	"action" varchar NOT NULL,
  	"status" "enum_audit_events_status" DEFAULT 'success',
  	"actor_type" "enum_audit_events_actor_type" NOT NULL,
  	"actor_doc_id" varchar,
  	"actor_collection" varchar,
  	"actor_label" varchar,
  	"actor_source" "enum_audit_events_actor_source",
  	"on_behalf_of_collection" varchar,
  	"on_behalf_of_doc_id" varchar,
  	"on_behalf_of_label" varchar,
  	"agent_key_id" varchar,
  	"agent_name" varchar,
  	"agent_model" varchar,
  	"agent_tool" varchar,
  	"via" "enum_audit_events_via",
  	"target_kind" "enum_audit_events_target_kind",
  	"target_slug" varchar,
  	"target_doc_id" varchar,
  	"target_label" varchar,
  	"target_locale" varchar,
  	"changes" jsonb,
  	"override_access" boolean,
  	"request_id" varchar,
  	"ip" varchar,
  	"user_agent" varchar,
  	"metadata" jsonb
  );
  
  ALTER TABLE "comments" ALTER COLUMN "author_id" DROP NOT NULL;
  CREATE INDEX "audit_events_occurred_at_idx" ON "audit_events" USING btree ("occurred_at");
  CREATE INDEX "audit_events_action_idx" ON "audit_events" USING btree ("action");
  CREATE INDEX "audit_events_actor_actor_type_idx" ON "audit_events" USING btree ("actor_type");
  CREATE INDEX "audit_events_actor_actor_doc_id_idx" ON "audit_events" USING btree ("actor_doc_id");
  CREATE INDEX "audit_events_on_behalf_of_on_behalf_of_doc_id_idx" ON "audit_events" USING btree ("on_behalf_of_doc_id");
  CREATE INDEX "audit_events_target_target_slug_idx" ON "audit_events" USING btree ("target_slug");
  CREATE INDEX "audit_events_target_target_doc_id_idx" ON "audit_events" USING btree ("target_doc_id");
  CREATE INDEX "audit_events_request_id_idx" ON "audit_events" USING btree ("request_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "audit_events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "audit_events" CASCADE;
  ALTER TABLE "comments" ALTER COLUMN "author_id" SET NOT NULL;
  DROP TYPE "public"."enum_audit_events_status";
  DROP TYPE "public"."enum_audit_events_actor_type";
  DROP TYPE "public"."enum_audit_events_actor_source";
  DROP TYPE "public"."enum_audit_events_via";
  DROP TYPE "public"."enum_audit_events_target_kind";`)
}
