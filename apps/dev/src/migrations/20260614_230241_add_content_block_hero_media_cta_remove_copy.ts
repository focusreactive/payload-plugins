import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-sqlite";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_blocks_hero_cta\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`url\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_hero\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_cta_order_idx\` ON \`pages_blocks_hero_cta\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_cta_parent_id_idx\` ON \`pages_blocks_hero_cta\` (\`_parent_id\`);`);
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_cta_locale_idx\` ON \`pages_blocks_hero_cta\` (\`_locale\`);`);
  await db.run(sql`CREATE TABLE \`pages_blocks_content\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`content\` text,
  	\`image_id\` integer,
  	\`_hidden\` integer DEFAULT false,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`pages_blocks_content_order_idx\` ON \`pages_blocks_content\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`pages_blocks_content_parent_id_idx\` ON \`pages_blocks_content\` (\`_parent_id\`);`);
  await db.run(sql`CREATE INDEX \`pages_blocks_content_path_idx\` ON \`pages_blocks_content\` (\`_path\`);`);
  await db.run(sql`CREATE INDEX \`pages_blocks_content_locale_idx\` ON \`pages_blocks_content\` (\`_locale\`);`);
  await db.run(sql`CREATE INDEX \`pages_blocks_content_image_idx\` ON \`pages_blocks_content\` (\`image_id\`);`);
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_hero_cta\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`url\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_hero\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_cta_order_idx\` ON \`_pages_v_blocks_hero_cta\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_cta_parent_id_idx\` ON \`_pages_v_blocks_hero_cta\` (\`_parent_id\`);`);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_cta_locale_idx\` ON \`_pages_v_blocks_hero_cta\` (\`_locale\`);`);
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_content\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`content\` text,
  	\`image_id\` integer,
  	\`_hidden\` integer DEFAULT false,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_content_order_idx\` ON \`_pages_v_blocks_content\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_content_parent_id_idx\` ON \`_pages_v_blocks_content\` (\`_parent_id\`);`);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_content_path_idx\` ON \`_pages_v_blocks_content\` (\`_path\`);`);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_content_locale_idx\` ON \`_pages_v_blocks_content\` (\`_locale\`);`);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_content_image_idx\` ON \`_pages_v_blocks_content\` (\`image_id\`);`);
  await db.run(sql`CREATE TABLE \`presets_blocks_hero_cta\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`url\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`presets_blocks_hero\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`presets_blocks_hero_cta_order_idx\` ON \`presets_blocks_hero_cta\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`presets_blocks_hero_cta_parent_id_idx\` ON \`presets_blocks_hero_cta\` (\`_parent_id\`);`);
  await db.run(sql`CREATE INDEX \`presets_blocks_hero_cta_locale_idx\` ON \`presets_blocks_hero_cta\` (\`_locale\`);`);
  await db.run(sql`CREATE TABLE \`presets_blocks_content\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	\`_hidden\` integer DEFAULT false,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`presets\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`presets_blocks_content_order_idx\` ON \`presets_blocks_content\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`presets_blocks_content_parent_id_idx\` ON \`presets_blocks_content\` (\`_parent_id\`);`);
  await db.run(sql`CREATE INDEX \`presets_blocks_content_path_idx\` ON \`presets_blocks_content\` (\`_path\`);`);
  await db.run(sql`CREATE INDEX \`presets_blocks_content_image_idx\` ON \`presets_blocks_content\` (\`image_id\`);`);
  await db.run(sql`CREATE TABLE \`presets_blocks_content_locales\` (
  	\`content\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`presets_blocks_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE UNIQUE INDEX \`presets_blocks_content_locales_locale_parent_id_unique\` ON \`presets_blocks_content_locales\` (\`_locale\`,\`_parent_id\`);`);
  await db.run(sql`DROP TABLE \`pages_blocks_copy\`;`);
  await db.run(sql`DROP TABLE \`_pages_v_blocks_copy\`;`);
  await db.run(sql`DROP TABLE \`presets_blocks_copy\`;`);
  await db.run(sql`DROP TABLE \`presets_blocks_copy_locales\`;`);
  await db.run(sql`ALTER TABLE \`pages_blocks_hero\` ADD \`image_id\` integer REFERENCES media(id);`);
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_image_idx\` ON \`pages_blocks_hero\` (\`image_id\`);`);
  await db.run(sql`ALTER TABLE \`pages_locales\` ADD \`seo_title\` text;`);
  await db.run(sql`ALTER TABLE \`pages_locales\` ADD \`meta_description\` text;`);
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_hero\` ADD \`image_id\` integer REFERENCES media(id);`);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_image_idx\` ON \`_pages_v_blocks_hero\` (\`image_id\`);`);
  await db.run(sql`ALTER TABLE \`_pages_v_locales\` ADD \`version_seo_title\` text;`);
  await db.run(sql`ALTER TABLE \`_pages_v_locales\` ADD \`version_meta_description\` text;`);
  await db.run(sql`ALTER TABLE \`presets_blocks_hero\` ADD \`image_id\` integer REFERENCES media(id);`);
  await db.run(sql`CREATE INDEX \`presets_blocks_hero_image_idx\` ON \`presets_blocks_hero\` (\`image_id\`);`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_blocks_copy\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text,
  	\`_hidden\` integer DEFAULT false,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`pages_blocks_copy_order_idx\` ON \`pages_blocks_copy\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`pages_blocks_copy_parent_id_idx\` ON \`pages_blocks_copy\` (\`_parent_id\`);`);
  await db.run(sql`CREATE INDEX \`pages_blocks_copy_path_idx\` ON \`pages_blocks_copy\` (\`_path\`);`);
  await db.run(sql`CREATE INDEX \`pages_blocks_copy_locale_idx\` ON \`pages_blocks_copy\` (\`_locale\`);`);
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_copy\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`text\` text,
  	\`_hidden\` integer DEFAULT false,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_copy_order_idx\` ON \`_pages_v_blocks_copy\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_copy_parent_id_idx\` ON \`_pages_v_blocks_copy\` (\`_parent_id\`);`);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_copy_path_idx\` ON \`_pages_v_blocks_copy\` (\`_path\`);`);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_copy_locale_idx\` ON \`_pages_v_blocks_copy\` (\`_locale\`);`);
  await db.run(sql`CREATE TABLE \`presets_blocks_copy\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`_hidden\` integer DEFAULT false,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`presets\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`presets_blocks_copy_order_idx\` ON \`presets_blocks_copy\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`presets_blocks_copy_parent_id_idx\` ON \`presets_blocks_copy\` (\`_parent_id\`);`);
  await db.run(sql`CREATE INDEX \`presets_blocks_copy_path_idx\` ON \`presets_blocks_copy\` (\`_path\`);`);
  await db.run(sql`CREATE TABLE \`presets_blocks_copy_locales\` (
  	\`text\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`presets_blocks_copy\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE UNIQUE INDEX \`presets_blocks_copy_locales_locale_parent_id_unique\` ON \`presets_blocks_copy_locales\` (\`_locale\`,\`_parent_id\`);`);
  await db.run(sql`DROP TABLE \`pages_blocks_hero_cta\`;`);
  await db.run(sql`DROP TABLE \`pages_blocks_content\`;`);
  await db.run(sql`DROP TABLE \`_pages_v_blocks_hero_cta\`;`);
  await db.run(sql`DROP TABLE \`_pages_v_blocks_content\`;`);
  await db.run(sql`DROP TABLE \`presets_blocks_hero_cta\`;`);
  await db.run(sql`DROP TABLE \`presets_blocks_content\`;`);
  await db.run(sql`DROP TABLE \`presets_blocks_content_locales\`;`);
  await db.run(sql`PRAGMA foreign_keys=OFF;`);
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_hero\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`description\` text,
  	\`_hidden\` integer DEFAULT false,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`INSERT INTO \`__new_pages_blocks_hero\`("_order", "_parent_id", "_path", "_locale", "id", "title", "description", "_hidden", "block_name") SELECT "_order", "_parent_id", "_path", "_locale", "id", "title", "description", "_hidden", "block_name" FROM \`pages_blocks_hero\`;`
  );
  await db.run(sql`DROP TABLE \`pages_blocks_hero\`;`);
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_hero\` RENAME TO \`pages_blocks_hero\`;`);
  await db.run(sql`PRAGMA foreign_keys=ON;`);
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_order_idx\` ON \`pages_blocks_hero\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_parent_id_idx\` ON \`pages_blocks_hero\` (\`_parent_id\`);`);
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_path_idx\` ON \`pages_blocks_hero\` (\`_path\`);`);
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_locale_idx\` ON \`pages_blocks_hero\` (\`_locale\`);`);
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_hero\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`description\` text,
  	\`_hidden\` integer DEFAULT false,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`INSERT INTO \`__new__pages_v_blocks_hero\`("_order", "_parent_id", "_path", "_locale", "id", "title", "description", "_hidden", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "_locale", "id", "title", "description", "_hidden", "_uuid", "block_name" FROM \`_pages_v_blocks_hero\`;`
  );
  await db.run(sql`DROP TABLE \`_pages_v_blocks_hero\`;`);
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_hero\` RENAME TO \`_pages_v_blocks_hero\`;`);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_order_idx\` ON \`_pages_v_blocks_hero\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_parent_id_idx\` ON \`_pages_v_blocks_hero\` (\`_parent_id\`);`);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_path_idx\` ON \`_pages_v_blocks_hero\` (\`_path\`);`);
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_locale_idx\` ON \`_pages_v_blocks_hero\` (\`_locale\`);`);
  await db.run(sql`CREATE TABLE \`__new_presets_blocks_hero\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`_hidden\` integer DEFAULT false,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`presets\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`INSERT INTO \`__new_presets_blocks_hero\`("_order", "_parent_id", "_path", "id", "_hidden", "block_name") SELECT "_order", "_parent_id", "_path", "id", "_hidden", "block_name" FROM \`presets_blocks_hero\`;`
  );
  await db.run(sql`DROP TABLE \`presets_blocks_hero\`;`);
  await db.run(sql`ALTER TABLE \`__new_presets_blocks_hero\` RENAME TO \`presets_blocks_hero\`;`);
  await db.run(sql`CREATE INDEX \`presets_blocks_hero_order_idx\` ON \`presets_blocks_hero\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`presets_blocks_hero_parent_id_idx\` ON \`presets_blocks_hero\` (\`_parent_id\`);`);
  await db.run(sql`CREATE INDEX \`presets_blocks_hero_path_idx\` ON \`presets_blocks_hero\` (\`_path\`);`);
  await db.run(sql`ALTER TABLE \`pages_locales\` DROP COLUMN \`seo_title\`;`);
  await db.run(sql`ALTER TABLE \`pages_locales\` DROP COLUMN \`meta_description\`;`);
  await db.run(sql`ALTER TABLE \`_pages_v_locales\` DROP COLUMN \`version_seo_title\`;`);
  await db.run(sql`ALTER TABLE \`_pages_v_locales\` DROP COLUMN \`version_meta_description\`;`);
}
