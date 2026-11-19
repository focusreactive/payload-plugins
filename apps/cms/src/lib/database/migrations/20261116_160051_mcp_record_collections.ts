import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "clinics_create" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "clinics_update" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "clinics_delete" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "conditions_create" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "conditions_update" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "conditions_delete" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "doctors_create" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "doctors_update" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "doctors_delete" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "states_create" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "states_update" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "states_delete" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "treatments_create" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "treatments_update" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "treatments_delete" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "clinics_create";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "clinics_update";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "clinics_delete";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "conditions_create";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "conditions_update";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "conditions_delete";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "doctors_create";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "doctors_update";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "doctors_delete";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "states_create";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "states_update";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "states_delete";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "treatments_create";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "treatments_update";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "treatments_delete";`)
}
