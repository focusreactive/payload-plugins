import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "vacancies_create" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "vacancies_update" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "vacancies_delete" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "vacancies_create";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "vacancies_update";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "vacancies_delete";`)
}
