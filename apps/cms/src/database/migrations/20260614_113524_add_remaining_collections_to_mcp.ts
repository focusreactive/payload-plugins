import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "authors_create" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "authors_update" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "authors_delete" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "categories_create" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "categories_update" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "categories_delete" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "media_create" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "media_update" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "media_delete" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "testimonials_create" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "testimonials_update" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "testimonials_delete" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "users_create" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "users_update" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "users_delete" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "site_settings_update" boolean DEFAULT false;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "authors_create";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "authors_update";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "authors_delete";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "categories_create";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "categories_update";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "categories_delete";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "media_create";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "media_update";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "media_delete";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "testimonials_create";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "testimonials_update";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "testimonials_delete";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "users_create";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "users_update";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "users_delete";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "site_settings_update";`);
}
