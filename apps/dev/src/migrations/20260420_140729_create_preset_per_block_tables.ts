import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`presets_blocks_hero\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`presets\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`presets_blocks_hero_order_idx\` ON \`presets_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`presets_blocks_hero_parent_id_idx\` ON \`presets_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`presets_blocks_hero_path_idx\` ON \`presets_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`presets_blocks_copy\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`presets\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`presets_blocks_copy_order_idx\` ON \`presets_blocks_copy\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`presets_blocks_copy_parent_id_idx\` ON \`presets_blocks_copy\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`presets_blocks_copy_path_idx\` ON \`presets_blocks_copy\` (\`_path\`);`)
  const presetsColumns = await db.all(sql`PRAGMA table_info(\`presets\`)`)
  const columnNames = presetsColumns.map((c: any) => c.name)
  if (columnNames.includes('type')) await db.run(sql`ALTER TABLE \`presets\` DROP COLUMN \`type\`;`)
  if (columnNames.includes('hero_title')) await db.run(sql`ALTER TABLE \`presets\` DROP COLUMN \`hero_title\`;`)
  if (columnNames.includes('hero_description')) await db.run(sql`ALTER TABLE \`presets\` DROP COLUMN \`hero_description\`;`)
  if (columnNames.includes('copy_text')) await db.run(sql`ALTER TABLE \`presets\` DROP COLUMN \`copy_text\`;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`presets_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`presets_blocks_copy\`;`)
  await db.run(sql`ALTER TABLE \`presets\` ADD \`type\` text NOT NULL;`)
  await db.run(sql`ALTER TABLE \`presets\` ADD \`hero_title\` text;`)
  await db.run(sql`ALTER TABLE \`presets\` ADD \`hero_description\` text;`)
  await db.run(sql`ALTER TABLE \`presets\` ADD \`copy_text\` text;`)
}
