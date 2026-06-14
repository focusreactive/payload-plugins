import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_header_nav_items_dropdown_links_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."hdr_ni_dd_lnks_lnk_cp" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_header_nav_items_type" AS ENUM('link', 'dropdown');
  CREATE TYPE "public"."enum_header_nav_items_dropdown_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."hdr_ni_dd_ft_lnk_cp" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_header_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_header_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_header_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__header_v_version_nav_items_dropdown_links_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__header_v_version_nav_items_type" AS ENUM('link', 'dropdown');
  CREATE TYPE "public"."enum__header_v_version_nav_items_dropdown_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__header_v_version_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__header_v_version_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__header_v_version_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TABLE "header_nav_items_dropdown_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum_header_nav_items_dropdown_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "hdr_ni_dd_lnks_lnk_cp"
  );
  
  CREATE TABLE "header_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_header_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_header_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum_header_actions_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "_header_v_version_nav_items_dropdown_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum__header_v_version_nav_items_dropdown_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "hdr_ni_dd_lnks_lnk_cp",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_header_v_version_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__header_v_version_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__header_v_version_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum__header_v_version_actions_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  ALTER TABLE "header_nav_items" ADD COLUMN "label" varchar;
  ALTER TABLE "header_nav_items" ADD COLUMN "type" "enum_header_nav_items_type" DEFAULT 'link';
  ALTER TABLE "header_nav_items" ADD COLUMN "dropdown_featured_enabled" boolean DEFAULT false;
  ALTER TABLE "header_nav_items" ADD COLUMN "dropdown_featured_badge" varchar;
  ALTER TABLE "header_nav_items" ADD COLUMN "dropdown_featured_title" varchar;
  ALTER TABLE "header_nav_items" ADD COLUMN "dropdown_featured_description" varchar;
  ALTER TABLE "header_nav_items" ADD COLUMN "dropdown_featured_link_type" "enum_header_nav_items_dropdown_featured_link_type" DEFAULT 'reference';
  ALTER TABLE "header_nav_items" ADD COLUMN "dropdown_featured_link_new_tab" boolean;
  ALTER TABLE "header_nav_items" ADD COLUMN "dropdown_featured_link_url" varchar;
  ALTER TABLE "header_nav_items" ADD COLUMN "dropdown_featured_link_custom_page" "hdr_ni_dd_ft_lnk_cp";
  ALTER TABLE "header_nav_items" ADD COLUMN "dropdown_featured_link_label" varchar;
  ALTER TABLE "_header_v_version_nav_items" ADD COLUMN "label" varchar;
  ALTER TABLE "_header_v_version_nav_items" ADD COLUMN "type" "enum__header_v_version_nav_items_type" DEFAULT 'link';
  ALTER TABLE "_header_v_version_nav_items" ADD COLUMN "dropdown_featured_enabled" boolean DEFAULT false;
  ALTER TABLE "_header_v_version_nav_items" ADD COLUMN "dropdown_featured_badge" varchar;
  ALTER TABLE "_header_v_version_nav_items" ADD COLUMN "dropdown_featured_title" varchar;
  ALTER TABLE "_header_v_version_nav_items" ADD COLUMN "dropdown_featured_description" varchar;
  ALTER TABLE "_header_v_version_nav_items" ADD COLUMN "dropdown_featured_link_type" "enum__header_v_version_nav_items_dropdown_featured_link_type" DEFAULT 'reference';
  ALTER TABLE "_header_v_version_nav_items" ADD COLUMN "dropdown_featured_link_new_tab" boolean;
  ALTER TABLE "_header_v_version_nav_items" ADD COLUMN "dropdown_featured_link_url" varchar;
  ALTER TABLE "_header_v_version_nav_items" ADD COLUMN "dropdown_featured_link_custom_page" "hdr_ni_dd_ft_lnk_cp";
  ALTER TABLE "_header_v_version_nav_items" ADD COLUMN "dropdown_featured_link_label" varchar;
  ALTER TABLE "header_nav_items_dropdown_links" ADD CONSTRAINT "header_nav_items_dropdown_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header_nav_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_actions" ADD CONSTRAINT "header_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_header_v_version_nav_items_dropdown_links" ADD CONSTRAINT "_header_v_version_nav_items_dropdown_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_header_v_version_nav_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_header_v_version_actions" ADD CONSTRAINT "_header_v_version_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_header_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "header_nav_items_dropdown_links_order_idx" ON "header_nav_items_dropdown_links" USING btree ("_order");
  CREATE INDEX "header_nav_items_dropdown_links_parent_id_idx" ON "header_nav_items_dropdown_links" USING btree ("_parent_id");
  CREATE INDEX "header_nav_items_dropdown_links_locale_idx" ON "header_nav_items_dropdown_links" USING btree ("_locale");
  CREATE INDEX "header_actions_order_idx" ON "header_actions" USING btree ("_order");
  CREATE INDEX "header_actions_parent_id_idx" ON "header_actions" USING btree ("_parent_id");
  CREATE INDEX "header_actions_locale_idx" ON "header_actions" USING btree ("_locale");
  CREATE INDEX "_header_v_version_nav_items_dropdown_links_order_idx" ON "_header_v_version_nav_items_dropdown_links" USING btree ("_order");
  CREATE INDEX "_header_v_version_nav_items_dropdown_links_parent_id_idx" ON "_header_v_version_nav_items_dropdown_links" USING btree ("_parent_id");
  CREATE INDEX "_header_v_version_nav_items_dropdown_links_locale_idx" ON "_header_v_version_nav_items_dropdown_links" USING btree ("_locale");
  CREATE INDEX "_header_v_version_actions_order_idx" ON "_header_v_version_actions" USING btree ("_order");
  CREATE INDEX "_header_v_version_actions_parent_id_idx" ON "_header_v_version_actions" USING btree ("_parent_id");
  CREATE INDEX "_header_v_version_actions_locale_idx" ON "_header_v_version_actions" USING btree ("_locale");
  ALTER TABLE "header_nav_items" DROP COLUMN "link_label";
  ALTER TABLE "_header_v_version_nav_items" DROP COLUMN "link_label";`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "header_nav_items_dropdown_links" CASCADE;
  DROP TABLE "header_actions" CASCADE;
  DROP TABLE "_header_v_version_nav_items_dropdown_links" CASCADE;
  DROP TABLE "_header_v_version_actions" CASCADE;
  ALTER TABLE "header_nav_items" ADD COLUMN "link_label" varchar;
  ALTER TABLE "_header_v_version_nav_items" ADD COLUMN "link_label" varchar;
  ALTER TABLE "header_nav_items" DROP COLUMN "label";
  ALTER TABLE "header_nav_items" DROP COLUMN "type";
  ALTER TABLE "header_nav_items" DROP COLUMN "dropdown_featured_enabled";
  ALTER TABLE "header_nav_items" DROP COLUMN "dropdown_featured_badge";
  ALTER TABLE "header_nav_items" DROP COLUMN "dropdown_featured_title";
  ALTER TABLE "header_nav_items" DROP COLUMN "dropdown_featured_description";
  ALTER TABLE "header_nav_items" DROP COLUMN "dropdown_featured_link_type";
  ALTER TABLE "header_nav_items" DROP COLUMN "dropdown_featured_link_new_tab";
  ALTER TABLE "header_nav_items" DROP COLUMN "dropdown_featured_link_url";
  ALTER TABLE "header_nav_items" DROP COLUMN "dropdown_featured_link_custom_page";
  ALTER TABLE "header_nav_items" DROP COLUMN "dropdown_featured_link_label";
  ALTER TABLE "_header_v_version_nav_items" DROP COLUMN "label";
  ALTER TABLE "_header_v_version_nav_items" DROP COLUMN "type";
  ALTER TABLE "_header_v_version_nav_items" DROP COLUMN "dropdown_featured_enabled";
  ALTER TABLE "_header_v_version_nav_items" DROP COLUMN "dropdown_featured_badge";
  ALTER TABLE "_header_v_version_nav_items" DROP COLUMN "dropdown_featured_title";
  ALTER TABLE "_header_v_version_nav_items" DROP COLUMN "dropdown_featured_description";
  ALTER TABLE "_header_v_version_nav_items" DROP COLUMN "dropdown_featured_link_type";
  ALTER TABLE "_header_v_version_nav_items" DROP COLUMN "dropdown_featured_link_new_tab";
  ALTER TABLE "_header_v_version_nav_items" DROP COLUMN "dropdown_featured_link_url";
  ALTER TABLE "_header_v_version_nav_items" DROP COLUMN "dropdown_featured_link_custom_page";
  ALTER TABLE "_header_v_version_nav_items" DROP COLUMN "dropdown_featured_link_label";
  DROP TYPE "public"."enum_header_nav_items_dropdown_links_link_type";
  DROP TYPE "public"."hdr_ni_dd_lnks_lnk_cp";
  DROP TYPE "public"."enum_header_nav_items_type";
  DROP TYPE "public"."enum_header_nav_items_dropdown_featured_link_type";
  DROP TYPE "public"."hdr_ni_dd_ft_lnk_cp";
  DROP TYPE "public"."enum_header_actions_type";
  DROP TYPE "public"."enum_header_actions_custom_page";
  DROP TYPE "public"."enum_header_actions_appearance";
  DROP TYPE "public"."enum__header_v_version_nav_items_dropdown_links_link_type";
  DROP TYPE "public"."enum__header_v_version_nav_items_type";
  DROP TYPE "public"."enum__header_v_version_nav_items_dropdown_featured_link_type";
  DROP TYPE "public"."enum__header_v_version_actions_type";
  DROP TYPE "public"."enum__header_v_version_actions_custom_page";
  DROP TYPE "public"."enum__header_v_version_actions_appearance";`);
}
