import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_footer_link_groups_links_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_footer_link_groups_links_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_footer_legal_links_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_footer_legal_links_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__footer_v_version_link_groups_links_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__footer_v_version_link_groups_links_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__footer_v_version_legal_links_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__footer_v_version_legal_links_link_custom_page" AS ENUM('blog', 'search');
  CREATE TABLE "footer_link_groups_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_footer_link_groups_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_footer_link_groups_links_link_custom_page",
  	"link_label" varchar
  );
  
  CREATE TABLE "footer_link_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "footer_legal_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_footer_legal_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_footer_legal_links_link_custom_page",
  	"link_label" varchar
  );
  
  CREATE TABLE "footer_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer
  );
  
  CREATE TABLE "_footer_v_version_link_groups_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__footer_v_version_link_groups_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__footer_v_version_link_groups_links_link_custom_page",
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_footer_v_version_link_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_footer_v_version_legal_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__footer_v_version_legal_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__footer_v_version_legal_links_link_custom_page",
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_footer_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer
  );
  
  ALTER TABLE "footer_locales" ADD COLUMN "description" varchar;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_description" varchar;
  ALTER TABLE "footer_link_groups_links" ADD CONSTRAINT "footer_link_groups_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_link_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_link_groups" ADD CONSTRAINT "footer_link_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_legal_links" ADD CONSTRAINT "footer_legal_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_rels" ADD CONSTRAINT "footer_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_rels" ADD CONSTRAINT "footer_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_rels" ADD CONSTRAINT "footer_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_link_groups_links" ADD CONSTRAINT "_footer_v_version_link_groups_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v_version_link_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_link_groups" ADD CONSTRAINT "_footer_v_version_link_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_legal_links" ADD CONSTRAINT "_footer_v_version_legal_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_rels" ADD CONSTRAINT "_footer_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_footer_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_rels" ADD CONSTRAINT "_footer_v_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_rels" ADD CONSTRAINT "_footer_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "footer_link_groups_links_order_idx" ON "footer_link_groups_links" USING btree ("_order");
  CREATE INDEX "footer_link_groups_links_parent_id_idx" ON "footer_link_groups_links" USING btree ("_parent_id");
  CREATE INDEX "footer_link_groups_links_locale_idx" ON "footer_link_groups_links" USING btree ("_locale");
  CREATE INDEX "footer_link_groups_order_idx" ON "footer_link_groups" USING btree ("_order");
  CREATE INDEX "footer_link_groups_parent_id_idx" ON "footer_link_groups" USING btree ("_parent_id");
  CREATE INDEX "footer_link_groups_locale_idx" ON "footer_link_groups" USING btree ("_locale");
  CREATE INDEX "footer_legal_links_order_idx" ON "footer_legal_links" USING btree ("_order");
  CREATE INDEX "footer_legal_links_parent_id_idx" ON "footer_legal_links" USING btree ("_parent_id");
  CREATE INDEX "footer_legal_links_locale_idx" ON "footer_legal_links" USING btree ("_locale");
  CREATE INDEX "footer_rels_order_idx" ON "footer_rels" USING btree ("order");
  CREATE INDEX "footer_rels_parent_idx" ON "footer_rels" USING btree ("parent_id");
  CREATE INDEX "footer_rels_path_idx" ON "footer_rels" USING btree ("path");
  CREATE INDEX "footer_rels_locale_idx" ON "footer_rels" USING btree ("locale");
  CREATE INDEX "footer_rels_page_id_idx" ON "footer_rels" USING btree ("page_id","locale");
  CREATE INDEX "footer_rels_posts_id_idx" ON "footer_rels" USING btree ("posts_id","locale");
  CREATE INDEX "_footer_v_version_link_groups_links_order_idx" ON "_footer_v_version_link_groups_links" USING btree ("_order");
  CREATE INDEX "_footer_v_version_link_groups_links_parent_id_idx" ON "_footer_v_version_link_groups_links" USING btree ("_parent_id");
  CREATE INDEX "_footer_v_version_link_groups_links_locale_idx" ON "_footer_v_version_link_groups_links" USING btree ("_locale");
  CREATE INDEX "_footer_v_version_link_groups_order_idx" ON "_footer_v_version_link_groups" USING btree ("_order");
  CREATE INDEX "_footer_v_version_link_groups_parent_id_idx" ON "_footer_v_version_link_groups" USING btree ("_parent_id");
  CREATE INDEX "_footer_v_version_link_groups_locale_idx" ON "_footer_v_version_link_groups" USING btree ("_locale");
  CREATE INDEX "_footer_v_version_legal_links_order_idx" ON "_footer_v_version_legal_links" USING btree ("_order");
  CREATE INDEX "_footer_v_version_legal_links_parent_id_idx" ON "_footer_v_version_legal_links" USING btree ("_parent_id");
  CREATE INDEX "_footer_v_version_legal_links_locale_idx" ON "_footer_v_version_legal_links" USING btree ("_locale");
  CREATE INDEX "_footer_v_rels_order_idx" ON "_footer_v_rels" USING btree ("order");
  CREATE INDEX "_footer_v_rels_parent_idx" ON "_footer_v_rels" USING btree ("parent_id");
  CREATE INDEX "_footer_v_rels_path_idx" ON "_footer_v_rels" USING btree ("path");
  CREATE INDEX "_footer_v_rels_locale_idx" ON "_footer_v_rels" USING btree ("locale");
  CREATE INDEX "_footer_v_rels_page_id_idx" ON "_footer_v_rels" USING btree ("page_id","locale");
  CREATE INDEX "_footer_v_rels_posts_id_idx" ON "_footer_v_rels" USING btree ("posts_id","locale");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "footer_link_groups_links" CASCADE;
  DROP TABLE "footer_link_groups" CASCADE;
  DROP TABLE "footer_legal_links" CASCADE;
  DROP TABLE "footer_rels" CASCADE;
  DROP TABLE "_footer_v_version_link_groups_links" CASCADE;
  DROP TABLE "_footer_v_version_link_groups" CASCADE;
  DROP TABLE "_footer_v_version_legal_links" CASCADE;
  DROP TABLE "_footer_v_rels" CASCADE;
  ALTER TABLE "footer_locales" DROP COLUMN "description";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_description";
  DROP TYPE "public"."enum_footer_link_groups_links_link_type";
  DROP TYPE "public"."enum_footer_link_groups_links_link_custom_page";
  DROP TYPE "public"."enum_footer_legal_links_link_type";
  DROP TYPE "public"."enum_footer_legal_links_link_custom_page";
  DROP TYPE "public"."enum__footer_v_version_link_groups_links_link_type";
  DROP TYPE "public"."enum__footer_v_version_link_groups_links_link_custom_page";
  DROP TYPE "public"."enum__footer_v_version_legal_links_link_type";
  DROP TYPE "public"."enum__footer_v_version_legal_links_link_custom_page";`);
}
