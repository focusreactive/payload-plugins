import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DELETE FROM "page_blocks_hero" USING (
    SELECT "id", row_number() OVER (PARTITION BY "_parent_id", "_locale" ORDER BY "_order") AS "position"
    FROM "page_blocks_hero" WHERE "_path" = 'blocks'
  ) AS "ranked_heroes"
  WHERE "page_blocks_hero"."id" = "ranked_heroes"."id" AND "ranked_heroes"."position" > 1;
  UPDATE "page_blocks_hero" SET "_path" = 'hero', "_order" = 1 WHERE "_path" = 'blocks';
  DELETE FROM "_page_v_blocks_hero" USING (
    SELECT "id", row_number() OVER (PARTITION BY "_parent_id", "_locale" ORDER BY "_order") AS "position"
    FROM "_page_v_blocks_hero" WHERE "_path" = 'version.blocks'
  ) AS "ranked_heroes"
  WHERE "_page_v_blocks_hero"."id" = "ranked_heroes"."id" AND "ranked_heroes"."position" > 1;
  UPDATE "_page_v_blocks_hero" SET "_path" = 'version.hero', "_order" = 1 WHERE "_path" = 'version.blocks';
   DROP TABLE "gsec_blocks_hero_actions" CASCADE;
  DROP TABLE "gsec_blocks_hero" CASCADE;
  DROP TABLE "_gsec_v_blocks_hero_actions" CASCADE;
  DROP TABLE "_gsec_v_blocks_hero" CASCADE;
  DROP TYPE "public"."enum_gsec_blocks_hero_actions_type";
  DROP TYPE "public"."enum_gsec_blocks_hero_actions_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_hero_actions_appearance";
  DROP TYPE "public"."enum_gsec_blocks_hero_variant";
  DROP TYPE "public"."enum_gsec_blocks_hero_image_aspect_ratio";
  DROP TYPE "public"."enum_gsec_blocks_hero_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_hero_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_hero_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_hero_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_actions_type";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_actions_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_actions_appearance";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_variant";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_image_aspect_ratio";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_section_padding_x";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_gsec_blocks_hero_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_hero_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_hero_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_gsec_blocks_hero_variant" AS ENUM('showcase', 'centered');
  CREATE TYPE "public"."enum_gsec_blocks_hero_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_gsec_blocks_hero_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_hero_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_hero_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_hero_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_variant" AS ENUM('showcase', 'centered');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_section_padding_x" AS ENUM('none', 'base');
  CREATE TABLE "gsec_blocks_hero_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_gsec_blocks_hero_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_gsec_blocks_hero_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum_gsec_blocks_hero_actions_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "gsec_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_gsec_blocks_hero_variant" DEFAULT 'showcase',
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum_gsec_blocks_hero_image_aspect_ratio" DEFAULT '1/1',
  	"section_theme" "enum_gsec_blocks_hero_section_theme",
  	"section_max_width" "enum_gsec_blocks_hero_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_hero_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_hero_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_hero_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__gsec_v_blocks_hero_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__gsec_v_blocks_hero_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum__gsec_v_blocks_hero_actions_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__gsec_v_blocks_hero_variant" DEFAULT 'showcase',
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum__gsec_v_blocks_hero_image_aspect_ratio" DEFAULT '1/1',
  	"section_theme" "enum__gsec_v_blocks_hero_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_hero_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_hero_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_hero_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "gsec_blocks_hero_actions" ADD CONSTRAINT "gsec_blocks_hero_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_hero" ADD CONSTRAINT "gsec_blocks_hero_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_hero" ADD CONSTRAINT "gsec_blocks_hero_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_hero" ADD CONSTRAINT "gsec_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_hero_actions" ADD CONSTRAINT "_gsec_v_blocks_hero_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_hero" ADD CONSTRAINT "_gsec_v_blocks_hero_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_hero" ADD CONSTRAINT "_gsec_v_blocks_hero_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_hero" ADD CONSTRAINT "_gsec_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "gsec_blocks_hero_actions_order_idx" ON "gsec_blocks_hero_actions" USING btree ("_order");
  CREATE INDEX "gsec_blocks_hero_actions_parent_id_idx" ON "gsec_blocks_hero_actions" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_hero_actions_locale_idx" ON "gsec_blocks_hero_actions" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_hero_order_idx" ON "gsec_blocks_hero" USING btree ("_order");
  CREATE INDEX "gsec_blocks_hero_parent_id_idx" ON "gsec_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_hero_path_idx" ON "gsec_blocks_hero" USING btree ("_path");
  CREATE INDEX "gsec_blocks_hero_locale_idx" ON "gsec_blocks_hero" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_hero_image_image_image_idx" ON "gsec_blocks_hero" USING btree ("image_image_id");
  CREATE INDEX "gsec_blocks_hero_section_background_section_background_m_idx" ON "gsec_blocks_hero" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_hero_actions_order_idx" ON "_gsec_v_blocks_hero_actions" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_hero_actions_parent_id_idx" ON "_gsec_v_blocks_hero_actions" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_hero_actions_locale_idx" ON "_gsec_v_blocks_hero_actions" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_hero_order_idx" ON "_gsec_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_hero_parent_id_idx" ON "_gsec_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_hero_path_idx" ON "_gsec_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_hero_locale_idx" ON "_gsec_v_blocks_hero" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_hero_image_image_image_idx" ON "_gsec_v_blocks_hero" USING btree ("image_image_id");
  CREATE INDEX "_gsec_v_blocks_hero_section_background_section_backgroun_idx" ON "_gsec_v_blocks_hero" USING btree ("section_background_media_id");
  UPDATE "page_blocks_hero" SET "_path" = 'blocks', "_order" = 0 WHERE "_path" = 'hero';
  UPDATE "_page_v_blocks_hero" SET "_path" = 'version.blocks', "_order" = 0 WHERE "_path" = 'version.hero';`)
}
