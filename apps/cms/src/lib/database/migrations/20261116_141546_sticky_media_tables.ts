import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_stky_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_stky_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum___page_v_stky_v_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum___page_v_stky_v_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum_states_stky_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_stky_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum___states_v_stky_v_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum___states_v_stky_v_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum_clinics_stky_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_stky_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum___clinics_v_stky_v_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum___clinics_v_stky_v_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum_doctors_stky_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_stky_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum___doctors_v_stky_v_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum___doctors_v_stky_v_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum_treatments_stky_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_stky_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum___treatments_v_stky_v_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum___treatments_v_stky_v_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum_conditions_stky_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_stky_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum___conditions_v_stky_v_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum___conditions_v_stky_v_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum_posts_stky_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_stky_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum___posts_v_stky_v_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum___posts_v_stky_v_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TABLE "page_stky_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_stky_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum_page_stky_chapters_note_size" DEFAULT 'regular'
  );
  
  CREATE TABLE "page_stky" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "__page_v_stky_v_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum___page_v_stky_v_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum___page_v_stky_v_chapters_note_size" DEFAULT 'regular',
  	"_uuid" varchar
  );
  
  CREATE TABLE "__page_v_stky_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_stky_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_states_stky_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum_states_stky_chapters_note_size" DEFAULT 'regular'
  );
  
  CREATE TABLE "states_stky" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "__states_v_stky_v_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum___states_v_stky_v_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum___states_v_stky_v_chapters_note_size" DEFAULT 'regular',
  	"_uuid" varchar
  );
  
  CREATE TABLE "__states_v_stky_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_stky_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_clinics_stky_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum_clinics_stky_chapters_note_size" DEFAULT 'regular'
  );
  
  CREATE TABLE "clinics_stky" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "__clinics_v_stky_v_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum___clinics_v_stky_v_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum___clinics_v_stky_v_chapters_note_size" DEFAULT 'regular',
  	"_uuid" varchar
  );
  
  CREATE TABLE "__clinics_v_stky_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_stky_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_doctors_stky_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum_doctors_stky_chapters_note_size" DEFAULT 'regular'
  );
  
  CREATE TABLE "doctors_stky" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "__doctors_v_stky_v_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum___doctors_v_stky_v_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum___doctors_v_stky_v_chapters_note_size" DEFAULT 'regular',
  	"_uuid" varchar
  );
  
  CREATE TABLE "__doctors_v_stky_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_stky_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_treatments_stky_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum_treatments_stky_chapters_note_size" DEFAULT 'regular'
  );
  
  CREATE TABLE "treatments_stky" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "__treatments_v_stky_v_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum___treatments_v_stky_v_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum___treatments_v_stky_v_chapters_note_size" DEFAULT 'regular',
  	"_uuid" varchar
  );
  
  CREATE TABLE "__treatments_v_stky_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_stky_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_conditions_stky_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum_conditions_stky_chapters_note_size" DEFAULT 'regular'
  );
  
  CREATE TABLE "conditions_stky" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "__conditions_v_stky_v_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum___conditions_v_stky_v_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum___conditions_v_stky_v_chapters_note_size" DEFAULT 'regular',
  	"_uuid" varchar
  );
  
  CREATE TABLE "__conditions_v_stky_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_stky_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_posts_stky_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum_posts_stky_chapters_note_size" DEFAULT 'regular'
  );
  
  CREATE TABLE "posts_stky" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "__posts_v_stky_v_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum___posts_v_stky_v_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum___posts_v_stky_v_chapters_note_size" DEFAULT 'regular',
  	"_uuid" varchar
  );
  
  CREATE TABLE "__posts_v_stky_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  DROP TABLE "stky_chapters" CASCADE;
  DROP TABLE "stky" CASCADE;
  DROP TABLE "_stky_v_chapters" CASCADE;
  DROP TABLE "_stky_v" CASCADE;
  ALTER TABLE "page_stky_chapters" ADD CONSTRAINT "page_stky_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_stky_chapters" ADD CONSTRAINT "page_stky_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_stky"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_stky" ADD CONSTRAINT "page_stky_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__page_v_stky_v_chapters" ADD CONSTRAINT "__page_v_stky_v_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "__page_v_stky_v_chapters" ADD CONSTRAINT "__page_v_stky_v_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."__page_v_stky_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__page_v_stky_v" ADD CONSTRAINT "__page_v_stky_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_stky_chapters" ADD CONSTRAINT "states_stky_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_stky_chapters" ADD CONSTRAINT "states_stky_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states_stky"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_stky" ADD CONSTRAINT "states_stky_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__states_v_stky_v_chapters" ADD CONSTRAINT "__states_v_stky_v_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "__states_v_stky_v_chapters" ADD CONSTRAINT "__states_v_stky_v_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."__states_v_stky_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__states_v_stky_v" ADD CONSTRAINT "__states_v_stky_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_stky_chapters" ADD CONSTRAINT "clinics_stky_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_stky_chapters" ADD CONSTRAINT "clinics_stky_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics_stky"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_stky" ADD CONSTRAINT "clinics_stky_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__clinics_v_stky_v_chapters" ADD CONSTRAINT "__clinics_v_stky_v_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "__clinics_v_stky_v_chapters" ADD CONSTRAINT "__clinics_v_stky_v_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."__clinics_v_stky_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__clinics_v_stky_v" ADD CONSTRAINT "__clinics_v_stky_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_stky_chapters" ADD CONSTRAINT "doctors_stky_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_stky_chapters" ADD CONSTRAINT "doctors_stky_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors_stky"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_stky" ADD CONSTRAINT "doctors_stky_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__doctors_v_stky_v_chapters" ADD CONSTRAINT "__doctors_v_stky_v_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "__doctors_v_stky_v_chapters" ADD CONSTRAINT "__doctors_v_stky_v_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."__doctors_v_stky_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__doctors_v_stky_v" ADD CONSTRAINT "__doctors_v_stky_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_stky_chapters" ADD CONSTRAINT "treatments_stky_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_stky_chapters" ADD CONSTRAINT "treatments_stky_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments_stky"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_stky" ADD CONSTRAINT "treatments_stky_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__treatments_v_stky_v_chapters" ADD CONSTRAINT "__treatments_v_stky_v_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "__treatments_v_stky_v_chapters" ADD CONSTRAINT "__treatments_v_stky_v_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."__treatments_v_stky_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__treatments_v_stky_v" ADD CONSTRAINT "__treatments_v_stky_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_stky_chapters" ADD CONSTRAINT "conditions_stky_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_stky_chapters" ADD CONSTRAINT "conditions_stky_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions_stky"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_stky" ADD CONSTRAINT "conditions_stky_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__conditions_v_stky_v_chapters" ADD CONSTRAINT "__conditions_v_stky_v_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "__conditions_v_stky_v_chapters" ADD CONSTRAINT "__conditions_v_stky_v_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."__conditions_v_stky_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__conditions_v_stky_v" ADD CONSTRAINT "__conditions_v_stky_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_stky_chapters" ADD CONSTRAINT "posts_stky_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_stky_chapters" ADD CONSTRAINT "posts_stky_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_stky"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_stky" ADD CONSTRAINT "posts_stky_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__posts_v_stky_v_chapters" ADD CONSTRAINT "__posts_v_stky_v_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "__posts_v_stky_v_chapters" ADD CONSTRAINT "__posts_v_stky_v_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."__posts_v_stky_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__posts_v_stky_v" ADD CONSTRAINT "__posts_v_stky_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_stky_chapters_order_idx" ON "page_stky_chapters" USING btree ("_order");
  CREATE INDEX "page_stky_chapters_parent_id_idx" ON "page_stky_chapters" USING btree ("_parent_id");
  CREATE INDEX "page_stky_chapters_locale_idx" ON "page_stky_chapters" USING btree ("_locale");
  CREATE INDEX "page_stky_chapters_image_idx" ON "page_stky_chapters" USING btree ("image_id");
  CREATE INDEX "page_stky_order_idx" ON "page_stky" USING btree ("_order");
  CREATE INDEX "page_stky_parent_id_idx" ON "page_stky" USING btree ("_parent_id");
  CREATE INDEX "page_stky_path_idx" ON "page_stky" USING btree ("_path");
  CREATE INDEX "page_stky_locale_idx" ON "page_stky" USING btree ("_locale");
  CREATE INDEX "__page_v_stky_v_chapters_order_idx" ON "__page_v_stky_v_chapters" USING btree ("_order");
  CREATE INDEX "__page_v_stky_v_chapters_parent_id_idx" ON "__page_v_stky_v_chapters" USING btree ("_parent_id");
  CREATE INDEX "__page_v_stky_v_chapters_locale_idx" ON "__page_v_stky_v_chapters" USING btree ("_locale");
  CREATE INDEX "__page_v_stky_v_chapters_image_idx" ON "__page_v_stky_v_chapters" USING btree ("image_id");
  CREATE INDEX "__page_v_stky_v_order_idx" ON "__page_v_stky_v" USING btree ("_order");
  CREATE INDEX "__page_v_stky_v_parent_id_idx" ON "__page_v_stky_v" USING btree ("_parent_id");
  CREATE INDEX "__page_v_stky_v_path_idx" ON "__page_v_stky_v" USING btree ("_path");
  CREATE INDEX "__page_v_stky_v_locale_idx" ON "__page_v_stky_v" USING btree ("_locale");
  CREATE INDEX "states_stky_chapters_order_idx" ON "states_stky_chapters" USING btree ("_order");
  CREATE INDEX "states_stky_chapters_parent_id_idx" ON "states_stky_chapters" USING btree ("_parent_id");
  CREATE INDEX "states_stky_chapters_locale_idx" ON "states_stky_chapters" USING btree ("_locale");
  CREATE INDEX "states_stky_chapters_image_idx" ON "states_stky_chapters" USING btree ("image_id");
  CREATE INDEX "states_stky_order_idx" ON "states_stky" USING btree ("_order");
  CREATE INDEX "states_stky_parent_id_idx" ON "states_stky" USING btree ("_parent_id");
  CREATE INDEX "states_stky_path_idx" ON "states_stky" USING btree ("_path");
  CREATE INDEX "states_stky_locale_idx" ON "states_stky" USING btree ("_locale");
  CREATE INDEX "__states_v_stky_v_chapters_order_idx" ON "__states_v_stky_v_chapters" USING btree ("_order");
  CREATE INDEX "__states_v_stky_v_chapters_parent_id_idx" ON "__states_v_stky_v_chapters" USING btree ("_parent_id");
  CREATE INDEX "__states_v_stky_v_chapters_locale_idx" ON "__states_v_stky_v_chapters" USING btree ("_locale");
  CREATE INDEX "__states_v_stky_v_chapters_image_idx" ON "__states_v_stky_v_chapters" USING btree ("image_id");
  CREATE INDEX "__states_v_stky_v_order_idx" ON "__states_v_stky_v" USING btree ("_order");
  CREATE INDEX "__states_v_stky_v_parent_id_idx" ON "__states_v_stky_v" USING btree ("_parent_id");
  CREATE INDEX "__states_v_stky_v_path_idx" ON "__states_v_stky_v" USING btree ("_path");
  CREATE INDEX "__states_v_stky_v_locale_idx" ON "__states_v_stky_v" USING btree ("_locale");
  CREATE INDEX "clinics_stky_chapters_order_idx" ON "clinics_stky_chapters" USING btree ("_order");
  CREATE INDEX "clinics_stky_chapters_parent_id_idx" ON "clinics_stky_chapters" USING btree ("_parent_id");
  CREATE INDEX "clinics_stky_chapters_locale_idx" ON "clinics_stky_chapters" USING btree ("_locale");
  CREATE INDEX "clinics_stky_chapters_image_idx" ON "clinics_stky_chapters" USING btree ("image_id");
  CREATE INDEX "clinics_stky_order_idx" ON "clinics_stky" USING btree ("_order");
  CREATE INDEX "clinics_stky_parent_id_idx" ON "clinics_stky" USING btree ("_parent_id");
  CREATE INDEX "clinics_stky_path_idx" ON "clinics_stky" USING btree ("_path");
  CREATE INDEX "clinics_stky_locale_idx" ON "clinics_stky" USING btree ("_locale");
  CREATE INDEX "__clinics_v_stky_v_chapters_order_idx" ON "__clinics_v_stky_v_chapters" USING btree ("_order");
  CREATE INDEX "__clinics_v_stky_v_chapters_parent_id_idx" ON "__clinics_v_stky_v_chapters" USING btree ("_parent_id");
  CREATE INDEX "__clinics_v_stky_v_chapters_locale_idx" ON "__clinics_v_stky_v_chapters" USING btree ("_locale");
  CREATE INDEX "__clinics_v_stky_v_chapters_image_idx" ON "__clinics_v_stky_v_chapters" USING btree ("image_id");
  CREATE INDEX "__clinics_v_stky_v_order_idx" ON "__clinics_v_stky_v" USING btree ("_order");
  CREATE INDEX "__clinics_v_stky_v_parent_id_idx" ON "__clinics_v_stky_v" USING btree ("_parent_id");
  CREATE INDEX "__clinics_v_stky_v_path_idx" ON "__clinics_v_stky_v" USING btree ("_path");
  CREATE INDEX "__clinics_v_stky_v_locale_idx" ON "__clinics_v_stky_v" USING btree ("_locale");
  CREATE INDEX "doctors_stky_chapters_order_idx" ON "doctors_stky_chapters" USING btree ("_order");
  CREATE INDEX "doctors_stky_chapters_parent_id_idx" ON "doctors_stky_chapters" USING btree ("_parent_id");
  CREATE INDEX "doctors_stky_chapters_locale_idx" ON "doctors_stky_chapters" USING btree ("_locale");
  CREATE INDEX "doctors_stky_chapters_image_idx" ON "doctors_stky_chapters" USING btree ("image_id");
  CREATE INDEX "doctors_stky_order_idx" ON "doctors_stky" USING btree ("_order");
  CREATE INDEX "doctors_stky_parent_id_idx" ON "doctors_stky" USING btree ("_parent_id");
  CREATE INDEX "doctors_stky_path_idx" ON "doctors_stky" USING btree ("_path");
  CREATE INDEX "doctors_stky_locale_idx" ON "doctors_stky" USING btree ("_locale");
  CREATE INDEX "__doctors_v_stky_v_chapters_order_idx" ON "__doctors_v_stky_v_chapters" USING btree ("_order");
  CREATE INDEX "__doctors_v_stky_v_chapters_parent_id_idx" ON "__doctors_v_stky_v_chapters" USING btree ("_parent_id");
  CREATE INDEX "__doctors_v_stky_v_chapters_locale_idx" ON "__doctors_v_stky_v_chapters" USING btree ("_locale");
  CREATE INDEX "__doctors_v_stky_v_chapters_image_idx" ON "__doctors_v_stky_v_chapters" USING btree ("image_id");
  CREATE INDEX "__doctors_v_stky_v_order_idx" ON "__doctors_v_stky_v" USING btree ("_order");
  CREATE INDEX "__doctors_v_stky_v_parent_id_idx" ON "__doctors_v_stky_v" USING btree ("_parent_id");
  CREATE INDEX "__doctors_v_stky_v_path_idx" ON "__doctors_v_stky_v" USING btree ("_path");
  CREATE INDEX "__doctors_v_stky_v_locale_idx" ON "__doctors_v_stky_v" USING btree ("_locale");
  CREATE INDEX "treatments_stky_chapters_order_idx" ON "treatments_stky_chapters" USING btree ("_order");
  CREATE INDEX "treatments_stky_chapters_parent_id_idx" ON "treatments_stky_chapters" USING btree ("_parent_id");
  CREATE INDEX "treatments_stky_chapters_locale_idx" ON "treatments_stky_chapters" USING btree ("_locale");
  CREATE INDEX "treatments_stky_chapters_image_idx" ON "treatments_stky_chapters" USING btree ("image_id");
  CREATE INDEX "treatments_stky_order_idx" ON "treatments_stky" USING btree ("_order");
  CREATE INDEX "treatments_stky_parent_id_idx" ON "treatments_stky" USING btree ("_parent_id");
  CREATE INDEX "treatments_stky_path_idx" ON "treatments_stky" USING btree ("_path");
  CREATE INDEX "treatments_stky_locale_idx" ON "treatments_stky" USING btree ("_locale");
  CREATE INDEX "__treatments_v_stky_v_chapters_order_idx" ON "__treatments_v_stky_v_chapters" USING btree ("_order");
  CREATE INDEX "__treatments_v_stky_v_chapters_parent_id_idx" ON "__treatments_v_stky_v_chapters" USING btree ("_parent_id");
  CREATE INDEX "__treatments_v_stky_v_chapters_locale_idx" ON "__treatments_v_stky_v_chapters" USING btree ("_locale");
  CREATE INDEX "__treatments_v_stky_v_chapters_image_idx" ON "__treatments_v_stky_v_chapters" USING btree ("image_id");
  CREATE INDEX "__treatments_v_stky_v_order_idx" ON "__treatments_v_stky_v" USING btree ("_order");
  CREATE INDEX "__treatments_v_stky_v_parent_id_idx" ON "__treatments_v_stky_v" USING btree ("_parent_id");
  CREATE INDEX "__treatments_v_stky_v_path_idx" ON "__treatments_v_stky_v" USING btree ("_path");
  CREATE INDEX "__treatments_v_stky_v_locale_idx" ON "__treatments_v_stky_v" USING btree ("_locale");
  CREATE INDEX "conditions_stky_chapters_order_idx" ON "conditions_stky_chapters" USING btree ("_order");
  CREATE INDEX "conditions_stky_chapters_parent_id_idx" ON "conditions_stky_chapters" USING btree ("_parent_id");
  CREATE INDEX "conditions_stky_chapters_locale_idx" ON "conditions_stky_chapters" USING btree ("_locale");
  CREATE INDEX "conditions_stky_chapters_image_idx" ON "conditions_stky_chapters" USING btree ("image_id");
  CREATE INDEX "conditions_stky_order_idx" ON "conditions_stky" USING btree ("_order");
  CREATE INDEX "conditions_stky_parent_id_idx" ON "conditions_stky" USING btree ("_parent_id");
  CREATE INDEX "conditions_stky_path_idx" ON "conditions_stky" USING btree ("_path");
  CREATE INDEX "conditions_stky_locale_idx" ON "conditions_stky" USING btree ("_locale");
  CREATE INDEX "__conditions_v_stky_v_chapters_order_idx" ON "__conditions_v_stky_v_chapters" USING btree ("_order");
  CREATE INDEX "__conditions_v_stky_v_chapters_parent_id_idx" ON "__conditions_v_stky_v_chapters" USING btree ("_parent_id");
  CREATE INDEX "__conditions_v_stky_v_chapters_locale_idx" ON "__conditions_v_stky_v_chapters" USING btree ("_locale");
  CREATE INDEX "__conditions_v_stky_v_chapters_image_idx" ON "__conditions_v_stky_v_chapters" USING btree ("image_id");
  CREATE INDEX "__conditions_v_stky_v_order_idx" ON "__conditions_v_stky_v" USING btree ("_order");
  CREATE INDEX "__conditions_v_stky_v_parent_id_idx" ON "__conditions_v_stky_v" USING btree ("_parent_id");
  CREATE INDEX "__conditions_v_stky_v_path_idx" ON "__conditions_v_stky_v" USING btree ("_path");
  CREATE INDEX "__conditions_v_stky_v_locale_idx" ON "__conditions_v_stky_v" USING btree ("_locale");
  CREATE INDEX "posts_stky_chapters_order_idx" ON "posts_stky_chapters" USING btree ("_order");
  CREATE INDEX "posts_stky_chapters_parent_id_idx" ON "posts_stky_chapters" USING btree ("_parent_id");
  CREATE INDEX "posts_stky_chapters_locale_idx" ON "posts_stky_chapters" USING btree ("_locale");
  CREATE INDEX "posts_stky_chapters_image_idx" ON "posts_stky_chapters" USING btree ("image_id");
  CREATE INDEX "posts_stky_order_idx" ON "posts_stky" USING btree ("_order");
  CREATE INDEX "posts_stky_parent_id_idx" ON "posts_stky" USING btree ("_parent_id");
  CREATE INDEX "posts_stky_path_idx" ON "posts_stky" USING btree ("_path");
  CREATE INDEX "posts_stky_locale_idx" ON "posts_stky" USING btree ("_locale");
  CREATE INDEX "__posts_v_stky_v_chapters_order_idx" ON "__posts_v_stky_v_chapters" USING btree ("_order");
  CREATE INDEX "__posts_v_stky_v_chapters_parent_id_idx" ON "__posts_v_stky_v_chapters" USING btree ("_parent_id");
  CREATE INDEX "__posts_v_stky_v_chapters_locale_idx" ON "__posts_v_stky_v_chapters" USING btree ("_locale");
  CREATE INDEX "__posts_v_stky_v_chapters_image_idx" ON "__posts_v_stky_v_chapters" USING btree ("image_id");
  CREATE INDEX "__posts_v_stky_v_order_idx" ON "__posts_v_stky_v" USING btree ("_order");
  CREATE INDEX "__posts_v_stky_v_parent_id_idx" ON "__posts_v_stky_v" USING btree ("_parent_id");
  CREATE INDEX "__posts_v_stky_v_path_idx" ON "__posts_v_stky_v" USING btree ("_path");
  CREATE INDEX "__posts_v_stky_v_locale_idx" ON "__posts_v_stky_v" USING btree ("_locale");
  DROP TYPE "public"."enum_stky_chapters_button_link_kind";
  DROP TYPE "public"."enum_stky_chapters_note_size";
  DROP TYPE "public"."enum__stky_v_chapters_button_link_kind";
  DROP TYPE "public"."enum__stky_v_chapters_note_size";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_stky_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_stky_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum__stky_v_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__stky_v_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TABLE "stky_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_stky_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum_stky_chapters_note_size" DEFAULT 'regular'
  );
  
  CREATE TABLE "stky" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_stky_v_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__stky_v_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum__stky_v_chapters_note_size" DEFAULT 'regular',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_stky_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  DROP TABLE "page_stky_chapters" CASCADE;
  DROP TABLE "page_stky" CASCADE;
  DROP TABLE "__page_v_stky_v_chapters" CASCADE;
  DROP TABLE "__page_v_stky_v" CASCADE;
  DROP TABLE "states_stky_chapters" CASCADE;
  DROP TABLE "states_stky" CASCADE;
  DROP TABLE "__states_v_stky_v_chapters" CASCADE;
  DROP TABLE "__states_v_stky_v" CASCADE;
  DROP TABLE "clinics_stky_chapters" CASCADE;
  DROP TABLE "clinics_stky" CASCADE;
  DROP TABLE "__clinics_v_stky_v_chapters" CASCADE;
  DROP TABLE "__clinics_v_stky_v" CASCADE;
  DROP TABLE "doctors_stky_chapters" CASCADE;
  DROP TABLE "doctors_stky" CASCADE;
  DROP TABLE "__doctors_v_stky_v_chapters" CASCADE;
  DROP TABLE "__doctors_v_stky_v" CASCADE;
  DROP TABLE "treatments_stky_chapters" CASCADE;
  DROP TABLE "treatments_stky" CASCADE;
  DROP TABLE "__treatments_v_stky_v_chapters" CASCADE;
  DROP TABLE "__treatments_v_stky_v" CASCADE;
  DROP TABLE "conditions_stky_chapters" CASCADE;
  DROP TABLE "conditions_stky" CASCADE;
  DROP TABLE "__conditions_v_stky_v_chapters" CASCADE;
  DROP TABLE "__conditions_v_stky_v" CASCADE;
  DROP TABLE "posts_stky_chapters" CASCADE;
  DROP TABLE "posts_stky" CASCADE;
  DROP TABLE "__posts_v_stky_v_chapters" CASCADE;
  DROP TABLE "__posts_v_stky_v" CASCADE;
  ALTER TABLE "stky_chapters" ADD CONSTRAINT "stky_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stky_chapters" ADD CONSTRAINT "stky_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stky"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stky" ADD CONSTRAINT "stky_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stky_v_chapters" ADD CONSTRAINT "_stky_v_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stky_v_chapters" ADD CONSTRAINT "_stky_v_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stky_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stky_v" ADD CONSTRAINT "_stky_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "stky_chapters_order_idx" ON "stky_chapters" USING btree ("_order");
  CREATE INDEX "stky_chapters_parent_id_idx" ON "stky_chapters" USING btree ("_parent_id");
  CREATE INDEX "stky_chapters_locale_idx" ON "stky_chapters" USING btree ("_locale");
  CREATE INDEX "stky_chapters_image_idx" ON "stky_chapters" USING btree ("image_id");
  CREATE INDEX "stky_order_idx" ON "stky" USING btree ("_order");
  CREATE INDEX "stky_parent_id_idx" ON "stky" USING btree ("_parent_id");
  CREATE INDEX "stky_path_idx" ON "stky" USING btree ("_path");
  CREATE INDEX "stky_locale_idx" ON "stky" USING btree ("_locale");
  CREATE INDEX "_stky_v_chapters_order_idx" ON "_stky_v_chapters" USING btree ("_order");
  CREATE INDEX "_stky_v_chapters_parent_id_idx" ON "_stky_v_chapters" USING btree ("_parent_id");
  CREATE INDEX "_stky_v_chapters_locale_idx" ON "_stky_v_chapters" USING btree ("_locale");
  CREATE INDEX "_stky_v_chapters_image_idx" ON "_stky_v_chapters" USING btree ("image_id");
  CREATE INDEX "_stky_v_order_idx" ON "_stky_v" USING btree ("_order");
  CREATE INDEX "_stky_v_parent_id_idx" ON "_stky_v" USING btree ("_parent_id");
  CREATE INDEX "_stky_v_path_idx" ON "_stky_v" USING btree ("_path");
  CREATE INDEX "_stky_v_locale_idx" ON "_stky_v" USING btree ("_locale");
  DROP TYPE "public"."enum_page_stky_chapters_button_link_kind";
  DROP TYPE "public"."enum_page_stky_chapters_note_size";
  DROP TYPE "public"."enum___page_v_stky_v_chapters_button_link_kind";
  DROP TYPE "public"."enum___page_v_stky_v_chapters_note_size";
  DROP TYPE "public"."enum_states_stky_chapters_button_link_kind";
  DROP TYPE "public"."enum_states_stky_chapters_note_size";
  DROP TYPE "public"."enum___states_v_stky_v_chapters_button_link_kind";
  DROP TYPE "public"."enum___states_v_stky_v_chapters_note_size";
  DROP TYPE "public"."enum_clinics_stky_chapters_button_link_kind";
  DROP TYPE "public"."enum_clinics_stky_chapters_note_size";
  DROP TYPE "public"."enum___clinics_v_stky_v_chapters_button_link_kind";
  DROP TYPE "public"."enum___clinics_v_stky_v_chapters_note_size";
  DROP TYPE "public"."enum_doctors_stky_chapters_button_link_kind";
  DROP TYPE "public"."enum_doctors_stky_chapters_note_size";
  DROP TYPE "public"."enum___doctors_v_stky_v_chapters_button_link_kind";
  DROP TYPE "public"."enum___doctors_v_stky_v_chapters_note_size";
  DROP TYPE "public"."enum_treatments_stky_chapters_button_link_kind";
  DROP TYPE "public"."enum_treatments_stky_chapters_note_size";
  DROP TYPE "public"."enum___treatments_v_stky_v_chapters_button_link_kind";
  DROP TYPE "public"."enum___treatments_v_stky_v_chapters_note_size";
  DROP TYPE "public"."enum_conditions_stky_chapters_button_link_kind";
  DROP TYPE "public"."enum_conditions_stky_chapters_note_size";
  DROP TYPE "public"."enum___conditions_v_stky_v_chapters_button_link_kind";
  DROP TYPE "public"."enum___conditions_v_stky_v_chapters_note_size";
  DROP TYPE "public"."enum_posts_stky_chapters_button_link_kind";
  DROP TYPE "public"."enum_posts_stky_chapters_note_size";
  DROP TYPE "public"."enum___posts_v_stky_v_chapters_button_link_kind";
  DROP TYPE "public"."enum___posts_v_stky_v_chapters_note_size";`)
}
