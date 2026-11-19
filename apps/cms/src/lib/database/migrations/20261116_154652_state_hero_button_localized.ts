import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "states_locales" ADD COLUMN "hero_button_text" varchar;
  ALTER TABLE "states_locales" ADD COLUMN "hero_button_link_kind" "enum_states_hero_button_link_kind" DEFAULT 'internal';
  ALTER TABLE "states_locales" ADD COLUMN "hero_button_link_new_tab" boolean;
  ALTER TABLE "states_locales" ADD COLUMN "hero_button_link_path" varchar;
  ALTER TABLE "states_locales" ADD COLUMN "hero_button_link_url" varchar;
  ALTER TABLE "_states_v_locales" ADD COLUMN "version_hero_button_text" varchar;
  ALTER TABLE "_states_v_locales" ADD COLUMN "version_hero_button_link_kind" "enum__states_v_version_hero_button_link_kind" DEFAULT 'internal';
  ALTER TABLE "_states_v_locales" ADD COLUMN "version_hero_button_link_new_tab" boolean;
  ALTER TABLE "_states_v_locales" ADD COLUMN "version_hero_button_link_path" varchar;
  ALTER TABLE "_states_v_locales" ADD COLUMN "version_hero_button_link_url" varchar;
  ALTER TABLE "states" DROP COLUMN "hero_button_text";
  ALTER TABLE "states" DROP COLUMN "hero_button_link_kind";
  ALTER TABLE "states" DROP COLUMN "hero_button_link_new_tab";
  ALTER TABLE "states" DROP COLUMN "hero_button_link_path";
  ALTER TABLE "states" DROP COLUMN "hero_button_link_url";
  ALTER TABLE "_states_v" DROP COLUMN "version_hero_button_text";
  ALTER TABLE "_states_v" DROP COLUMN "version_hero_button_link_kind";
  ALTER TABLE "_states_v" DROP COLUMN "version_hero_button_link_new_tab";
  ALTER TABLE "_states_v" DROP COLUMN "version_hero_button_link_path";
  ALTER TABLE "_states_v" DROP COLUMN "version_hero_button_link_url";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "states" ADD COLUMN "hero_button_text" varchar;
  ALTER TABLE "states" ADD COLUMN "hero_button_link_kind" "enum_states_hero_button_link_kind" DEFAULT 'internal';
  ALTER TABLE "states" ADD COLUMN "hero_button_link_new_tab" boolean;
  ALTER TABLE "states" ADD COLUMN "hero_button_link_path" varchar;
  ALTER TABLE "states" ADD COLUMN "hero_button_link_url" varchar;
  ALTER TABLE "_states_v" ADD COLUMN "version_hero_button_text" varchar;
  ALTER TABLE "_states_v" ADD COLUMN "version_hero_button_link_kind" "enum__states_v_version_hero_button_link_kind" DEFAULT 'internal';
  ALTER TABLE "_states_v" ADD COLUMN "version_hero_button_link_new_tab" boolean;
  ALTER TABLE "_states_v" ADD COLUMN "version_hero_button_link_path" varchar;
  ALTER TABLE "_states_v" ADD COLUMN "version_hero_button_link_url" varchar;
  ALTER TABLE "states_locales" DROP COLUMN "hero_button_text";
  ALTER TABLE "states_locales" DROP COLUMN "hero_button_link_kind";
  ALTER TABLE "states_locales" DROP COLUMN "hero_button_link_new_tab";
  ALTER TABLE "states_locales" DROP COLUMN "hero_button_link_path";
  ALTER TABLE "states_locales" DROP COLUMN "hero_button_link_url";
  ALTER TABLE "_states_v_locales" DROP COLUMN "version_hero_button_text";
  ALTER TABLE "_states_v_locales" DROP COLUMN "version_hero_button_link_kind";
  ALTER TABLE "_states_v_locales" DROP COLUMN "version_hero_button_link_new_tab";
  ALTER TABLE "_states_v_locales" DROP COLUMN "version_hero_button_link_path";
  ALTER TABLE "_states_v_locales" DROP COLUMN "version_hero_button_link_url";`)
}
