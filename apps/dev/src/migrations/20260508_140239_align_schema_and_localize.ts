import type { MigrateUpArgs, MigrateDownArgs} from "@payloadcms/db-sqlite";
import { sql } from "@payloadcms/db-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_locales\` (
  	\`title\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`pages_locales_locale_parent_id_unique\` ON \`pages_locales\` (\`_locale\`,\`_parent_id\`);`
  );
  await db.run(sql`CREATE TABLE \`_pages_v_locales\` (
  	\`version_title\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`_pages_v_locales_locale_parent_id_unique\` ON \`_pages_v_locales\` (\`_locale\`,\`_parent_id\`);`
  );
  await db.run(sql`CREATE TABLE \`presets_locales\` (
  	\`name\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`presets\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`presets_locales_locale_parent_id_unique\` ON \`presets_locales\` (\`_locale\`,\`_parent_id\`);`
  );
  await db.run(sql`DROP TABLE \`releases\`;`);
  await db.run(sql`DROP TABLE \`release_items\`;`);
  await db.run(sql`PRAGMA foreign_keys=OFF;`);
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	\`pages_id\` integer,
  	\`presets_id\` integer,
  	\`comments_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`presets_id\`) REFERENCES \`presets\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`comments_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id", "pages_id", "presets_id", "comments_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id", "pages_id", "presets_id", "comments_id" FROM \`payload_locked_documents_rels\`;`
  );
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`);
  await db.run(
    sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`
  );
  await db.run(sql`PRAGMA foreign_keys=ON;`);
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_presets_id_idx\` ON \`payload_locked_documents_rels\` (\`presets_id\`);`
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_comments_id_idx\` ON \`payload_locked_documents_rels\` (\`comments_id\`);`
  );
  await db.run(sql`ALTER TABLE \`_users_v\` ADD \`snapshot\` integer;`);
  await db.run(sql`ALTER TABLE \`_users_v\` ADD \`published_locale\` text;`);
  await db.run(
    sql`CREATE INDEX \`_users_v_snapshot_idx\` ON \`_users_v\` (\`snapshot\`);`
  );
  await db.run(
    sql`CREATE INDEX \`_users_v_published_locale_idx\` ON \`_users_v\` (\`published_locale\`);`
  );
  await db.run(
    sql`ALTER TABLE \`pages_blocks_hero\` ADD \`_locale\` text NOT NULL;`
  );
  await db.run(
    sql`CREATE INDEX \`pages_blocks_hero_locale_idx\` ON \`pages_blocks_hero\` (\`_locale\`);`
  );
  await db.run(
    sql`ALTER TABLE \`pages_blocks_copy\` ADD \`_locale\` text NOT NULL;`
  );
  await db.run(
    sql`CREATE INDEX \`pages_blocks_copy_locale_idx\` ON \`pages_blocks_copy\` (\`_locale\`);`
  );
  await db.run(
    sql`ALTER TABLE \`_pages_v_blocks_hero\` ADD \`_locale\` text NOT NULL;`
  );
  await db.run(
    sql`CREATE INDEX \`_pages_v_blocks_hero_locale_idx\` ON \`_pages_v_blocks_hero\` (\`_locale\`);`
  );
  await db.run(
    sql`ALTER TABLE \`_pages_v_blocks_copy\` ADD \`_locale\` text NOT NULL;`
  );
  await db.run(
    sql`CREATE INDEX \`_pages_v_blocks_copy_locale_idx\` ON \`_pages_v_blocks_copy\` (\`_locale\`);`
  );
  await db.run(sql`ALTER TABLE \`_pages_v\` ADD \`snapshot\` integer;`);
  await db.run(sql`ALTER TABLE \`_pages_v\` ADD \`published_locale\` text;`);
  await db.run(
    sql`CREATE INDEX \`_pages_v_snapshot_idx\` ON \`_pages_v\` (\`snapshot\`);`
  );
  await db.run(
    sql`CREATE INDEX \`_pages_v_published_locale_idx\` ON \`_pages_v\` (\`published_locale\`);`
  );
  await db.run(sql`ALTER TABLE \`_pages_v\` DROP COLUMN \`version_title\`;`);
  await db.run(sql`ALTER TABLE \`pages\` DROP COLUMN \`title\`;`);
  await db.run(sql`ALTER TABLE \`presets\` DROP COLUMN \`name\`;`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`releases\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`description\` text,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`scheduled_at\` text,
  	\`published_at\` text,
  	\`rollback_snapshot\` text,
  	\`rollback_skipped\` text,
  	\`error_log\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(
    sql`CREATE INDEX \`releases_updated_at_idx\` ON \`releases\` (\`updated_at\`);`
  );
  await db.run(
    sql`CREATE INDEX \`releases_created_at_idx\` ON \`releases\` (\`created_at\`);`
  );
  await db.run(sql`CREATE TABLE \`release_items\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`release_id\` integer NOT NULL,
  	\`target_collection\` text NOT NULL,
  	\`target_doc\` text NOT NULL,
  	\`action\` text DEFAULT 'publish' NOT NULL,
  	\`status\` text DEFAULT 'pending' NOT NULL,
  	\`snapshot\` text NOT NULL,
  	\`base_version\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`release_id\`) REFERENCES \`releases\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE INDEX \`release_items_release_idx\` ON \`release_items\` (\`release_id\`);`
  );
  await db.run(
    sql`CREATE INDEX \`release_items_updated_at_idx\` ON \`release_items\` (\`updated_at\`);`
  );
  await db.run(
    sql`CREATE INDEX \`release_items_created_at_idx\` ON \`release_items\` (\`created_at\`);`
  );
  await db.run(sql`DROP TABLE \`pages_locales\`;`);
  await db.run(sql`DROP TABLE \`_pages_v_locales\`;`);
  await db.run(sql`DROP TABLE \`presets_locales\`;`);
  await db.run(sql`DROP INDEX \`_users_v_snapshot_idx\`;`);
  await db.run(sql`DROP INDEX \`_users_v_published_locale_idx\`;`);
  await db.run(sql`ALTER TABLE \`_users_v\` DROP COLUMN \`snapshot\`;`);
  await db.run(sql`ALTER TABLE \`_users_v\` DROP COLUMN \`published_locale\`;`);
  await db.run(sql`DROP INDEX \`pages_blocks_hero_locale_idx\`;`);
  await db.run(sql`ALTER TABLE \`pages_blocks_hero\` DROP COLUMN \`_locale\`;`);
  await db.run(sql`DROP INDEX \`pages_blocks_copy_locale_idx\`;`);
  await db.run(sql`ALTER TABLE \`pages_blocks_copy\` DROP COLUMN \`_locale\`;`);
  await db.run(sql`DROP INDEX \`_pages_v_blocks_hero_locale_idx\`;`);
  await db.run(
    sql`ALTER TABLE \`_pages_v_blocks_hero\` DROP COLUMN \`_locale\`;`
  );
  await db.run(sql`DROP INDEX \`_pages_v_blocks_copy_locale_idx\`;`);
  await db.run(
    sql`ALTER TABLE \`_pages_v_blocks_copy\` DROP COLUMN \`_locale\`;`
  );
  await db.run(sql`DROP INDEX \`_pages_v_snapshot_idx\`;`);
  await db.run(sql`DROP INDEX \`_pages_v_published_locale_idx\`;`);
  await db.run(sql`ALTER TABLE \`_pages_v\` ADD \`version_title\` text;`);
  await db.run(sql`ALTER TABLE \`_pages_v\` DROP COLUMN \`snapshot\`;`);
  await db.run(sql`ALTER TABLE \`_pages_v\` DROP COLUMN \`published_locale\`;`);
  await db.run(sql`ALTER TABLE \`pages\` ADD \`title\` text;`);
  await db.run(sql`ALTER TABLE \`presets\` ADD \`name\` text NOT NULL;`);
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`releases_id\` integer REFERENCES releases(id);`
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`release_items_id\` integer REFERENCES release_items(id);`
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_releases_id_idx\` ON \`payload_locked_documents_rels\` (\`releases_id\`);`
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_release_items_id_idx\` ON \`payload_locked_documents_rels\` (\`release_items_id\`);`
  );
}
