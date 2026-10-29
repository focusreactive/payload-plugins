import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`translator_runs\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`handle\` text NOT NULL,
  	\`collection_slug\` text NOT NULL,
  	\`collection_id\` text NOT NULL,
  	\`source_lng\` text NOT NULL,
  	\`target_lng\` text NOT NULL,
  	\`filters\` text,
  	\`publish_on_translation\` integer DEFAULT false NOT NULL,
  	\`requester_id\` text,
  	\`requester_collection\` text,
  	\`queued_at\` text NOT NULL,
  	\`started_at\` text,
  	\`settled_at\` text,
  	\`outcome\` text,
  	\`error\` text,
  	\`attempts\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`translator_runs_handle_idx\` ON \`translator_runs\` (\`handle\`);`)
  await db.run(sql`CREATE INDEX \`translator_runs_settled_at_idx\` ON \`translator_runs\` (\`settled_at\`);`)
  await db.run(sql`CREATE INDEX \`translator_runs_updated_at_idx\` ON \`translator_runs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`translator_runs_created_at_idx\` ON \`translator_runs\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`handle_targetLng_idx\` ON \`translator_runs\` (\`handle\`,\`target_lng\`);`)
  await db.run(sql`CREATE INDEX \`collectionSlug_collectionId_idx\` ON \`translator_runs\` (\`collection_slug\`,\`collection_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`translator_runs_id\` integer REFERENCES translator_runs(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_translator_runs_id_idx\` ON \`payload_locked_documents_rels\` (\`translator_runs_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`translator_runs\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	\`pages_id\` integer,
  	\`articles_id\` integer,
  	\`playground_id\` integer,
  	\`ab_experiments_id\` integer,
  	\`presets_id\` integer,
  	\`comments_id\` integer,
  	\`comment_reads_id\` integer,
  	\`translator_provenance_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`articles_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`playground_id\`) REFERENCES \`playground\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`ab_experiments_id\`) REFERENCES \`ab_experiments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`presets_id\`) REFERENCES \`presets\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`comments_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`comment_reads_id\`) REFERENCES \`comment_reads\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`translator_provenance_id\`) REFERENCES \`translator_provenance\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id", "pages_id", "articles_id", "playground_id", "ab_experiments_id", "presets_id", "comments_id", "comment_reads_id", "translator_provenance_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id", "pages_id", "articles_id", "playground_id", "ab_experiments_id", "presets_id", "comments_id", "comment_reads_id", "translator_provenance_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_articles_id_idx\` ON \`payload_locked_documents_rels\` (\`articles_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_playground_id_idx\` ON \`payload_locked_documents_rels\` (\`playground_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_ab_experiments_id_idx\` ON \`payload_locked_documents_rels\` (\`ab_experiments_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_presets_id_idx\` ON \`payload_locked_documents_rels\` (\`presets_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_comments_id_idx\` ON \`payload_locked_documents_rels\` (\`comments_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_comment_reads_id_idx\` ON \`payload_locked_documents_rels\` (\`comment_reads_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_translator_provenance_id_idx\` ON \`payload_locked_documents_rels\` (\`translator_provenance_id\`);`)
}
