import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "header_locales" ADD COLUMN "tagline" varchar;
  ALTER TABLE "_header_v_locales" ADD COLUMN "version_tagline" varchar;
  ALTER TABLE "footer" ADD COLUMN "contact_phone" varchar;
  ALTER TABLE "footer_locales" ADD COLUMN "contact_company_name" varchar;
  ALTER TABLE "footer_locales" ADD COLUMN "contact_address" varchar;
  ALTER TABLE "footer_locales" ADD COLUMN "contact_phone_label" varchar;
  ALTER TABLE "footer_locales" ADD COLUMN "newsletter_heading" varchar;
  ALTER TABLE "footer_locales" ADD COLUMN "newsletter_placeholder" varchar;
  ALTER TABLE "footer_locales" ADD COLUMN "newsletter_submit_label" varchar;
  ALTER TABLE "_footer_v" ADD COLUMN "version_contact_phone" varchar;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_contact_company_name" varchar;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_contact_address" varchar;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_contact_phone_label" varchar;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_newsletter_heading" varchar;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_newsletter_placeholder" varchar;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_newsletter_submit_label" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "header_locales" DROP COLUMN "tagline";
  ALTER TABLE "_header_v_locales" DROP COLUMN "version_tagline";
  ALTER TABLE "footer" DROP COLUMN "contact_phone";
  ALTER TABLE "footer_locales" DROP COLUMN "contact_company_name";
  ALTER TABLE "footer_locales" DROP COLUMN "contact_address";
  ALTER TABLE "footer_locales" DROP COLUMN "contact_phone_label";
  ALTER TABLE "footer_locales" DROP COLUMN "newsletter_heading";
  ALTER TABLE "footer_locales" DROP COLUMN "newsletter_placeholder";
  ALTER TABLE "footer_locales" DROP COLUMN "newsletter_submit_label";
  ALTER TABLE "_footer_v" DROP COLUMN "version_contact_phone";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_contact_company_name";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_contact_address";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_contact_phone_label";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_newsletter_heading";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_newsletter_placeholder";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_newsletter_submit_label";`)
}
