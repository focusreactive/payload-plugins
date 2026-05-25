import type { MigrateUpArgs, MigrateDownArgs } from "@payloadcms/db-sqlite";
import { sql } from "@payloadcms/db-sqlite";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`comment_reads\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`comment_id\` integer NOT NULL,
  	\`user_id\` integer NOT NULL,
  	\`read_at\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`comment_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`comment_reads_comment_idx\` ON \`comment_reads\` (\`comment_id\`);`);
  await db.run(sql`CREATE INDEX \`comment_reads_user_idx\` ON \`comment_reads\` (\`user_id\`);`);
  await db.run(sql`CREATE INDEX \`comment_reads_updated_at_idx\` ON \`comment_reads\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`comment_reads_created_at_idx\` ON \`comment_reads\` (\`created_at\`);`);
  await db.run(sql`PRAGMA foreign_keys=OFF;`);
  await db.run(sql`CREATE TABLE \`__new_comments_mentions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`user_id\` integer,
  	\`user_id_snapshot\` numeric,
  	\`display_name_snapshot\` text,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`INSERT INTO \`__new_comments_mentions\`("_order", "_parent_id", "id", "user_id") SELECT "_order", "_parent_id", "id", "user_id" FROM \`comments_mentions\`;`);
  await db.run(sql`DROP TABLE \`comments_mentions\`;`);
  await db.run(sql`ALTER TABLE \`__new_comments_mentions\` RENAME TO \`comments_mentions\`;`);
  await db.run(sql`PRAGMA foreign_keys=ON;`);
  await db.run(sql`CREATE INDEX \`comments_mentions_order_idx\` ON \`comments_mentions\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`comments_mentions_parent_id_idx\` ON \`comments_mentions\` (\`_parent_id\`);`);
  await db.run(sql`CREATE INDEX \`comments_mentions_user_idx\` ON \`comments_mentions\` (\`user_id\`);`);
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`comment_reads_id\` integer REFERENCES comment_reads(id);`);
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_comment_reads_id_idx\` ON \`payload_locked_documents_rels\` (\`comment_reads_id\`);`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`comment_reads\`;`);
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
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`);
  await db.run(sql`PRAGMA foreign_keys=ON;`);
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`);
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`);
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`);
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`);
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`);
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`);
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_presets_id_idx\` ON \`payload_locked_documents_rels\` (\`presets_id\`);`);
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_comments_id_idx\` ON \`payload_locked_documents_rels\` (\`comments_id\`);`);
  await db.run(sql`CREATE TABLE \`__new_comments_mentions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`user_id\` integer NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`INSERT INTO \`__new_comments_mentions\`("_order", "_parent_id", "id", "user_id") SELECT "_order", "_parent_id", "id", "user_id" FROM \`comments_mentions\`;`);
  await db.run(sql`DROP TABLE \`comments_mentions\`;`);
  await db.run(sql`ALTER TABLE \`__new_comments_mentions\` RENAME TO \`comments_mentions\`;`);
  await db.run(sql`CREATE INDEX \`comments_mentions_order_idx\` ON \`comments_mentions\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`comments_mentions_parent_id_idx\` ON \`comments_mentions\` (\`_parent_id\`);`);
  await db.run(sql`CREATE INDEX \`comments_mentions_user_idx\` ON \`comments_mentions\` (\`user_id\`);`);
}
