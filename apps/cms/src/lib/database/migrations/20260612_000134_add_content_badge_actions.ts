import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__page_v_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_presets_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TABLE "page_blocks_content_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_page_blocks_content_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_page_blocks_content_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum_page_blocks_content_actions_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "_page_v_blocks_content_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__page_v_blocks_content_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__page_v_blocks_content_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum__page_v_blocks_content_actions_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "presets_blocks_content_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_presets_blocks_content_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_presets_blocks_content_actions_custom_page",
  	"label" varchar NOT NULL,
  	"appearance" "enum_presets_blocks_content_actions_appearance" DEFAULT 'default'
  );
  
  ALTER TABLE "page_blocks_content" ADD COLUMN "badge" varchar;
  ALTER TABLE "_page_v_blocks_content" ADD COLUMN "badge" varchar;
  ALTER TABLE "presets_blocks_content_locales" ADD COLUMN "badge" varchar;
  ALTER TABLE "page_blocks_content_actions" ADD CONSTRAINT "page_blocks_content_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_content_actions" ADD CONSTRAINT "_page_v_blocks_content_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_content_actions" ADD CONSTRAINT "presets_blocks_content_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_content_actions_order_idx" ON "page_blocks_content_actions" USING btree ("_order");
  CREATE INDEX "page_blocks_content_actions_parent_id_idx" ON "page_blocks_content_actions" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_content_actions_locale_idx" ON "page_blocks_content_actions" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_content_actions_order_idx" ON "_page_v_blocks_content_actions" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_content_actions_parent_id_idx" ON "_page_v_blocks_content_actions" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_content_actions_locale_idx" ON "_page_v_blocks_content_actions" USING btree ("_locale");
  CREATE INDEX "presets_blocks_content_actions_order_idx" ON "presets_blocks_content_actions" USING btree ("_order");
  CREATE INDEX "presets_blocks_content_actions_parent_id_idx" ON "presets_blocks_content_actions" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_content_actions_locale_idx" ON "presets_blocks_content_actions" USING btree ("_locale");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "page_blocks_content_actions" CASCADE;
  DROP TABLE "_page_v_blocks_content_actions" CASCADE;
  DROP TABLE "presets_blocks_content_actions" CASCADE;
  ALTER TABLE "page_blocks_content" DROP COLUMN "badge";
  ALTER TABLE "_page_v_blocks_content" DROP COLUMN "badge";
  ALTER TABLE "presets_blocks_content_locales" DROP COLUMN "badge";
  DROP TYPE "public"."enum_page_blocks_content_actions_type";
  DROP TYPE "public"."enum_page_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum_page_blocks_content_actions_appearance";
  DROP TYPE "public"."enum__page_v_blocks_content_actions_type";
  DROP TYPE "public"."enum__page_v_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_content_actions_appearance";
  DROP TYPE "public"."enum_presets_blocks_content_actions_type";
  DROP TYPE "public"."enum_presets_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum_presets_blocks_content_actions_appearance";`);
}
