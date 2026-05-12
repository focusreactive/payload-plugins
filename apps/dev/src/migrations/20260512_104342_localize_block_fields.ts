import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`presets_blocks_hero_locales\` (
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`presets_blocks_hero\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE UNIQUE INDEX \`presets_blocks_hero_locales_locale_parent_id_unique\` ON \`presets_blocks_hero_locales\` (\`_locale\`,\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`presets_blocks_copy_locales\` (
  	\`text\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`presets_blocks_copy\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE UNIQUE INDEX \`presets_blocks_copy_locales_locale_parent_id_unique\` ON \`presets_blocks_copy_locales\` (\`_locale\`,\`_parent_id\`);`,
  )
  await db.run(sql`INSERT OR IGNORE INTO \`presets_blocks_hero_locales\` (\`title\`, \`description\`, \`_locale\`, \`_parent_id\`)
    SELECT \`title\`, \`description\`, 'en', \`id\` FROM \`presets_blocks_hero\` WHERE \`title\` IS NOT NULL;`)
  await db.run(sql`INSERT OR IGNORE INTO \`presets_blocks_copy_locales\` (\`text\`, \`_locale\`, \`_parent_id\`)
    SELECT \`text\`, 'en', \`id\` FROM \`presets_blocks_copy\` WHERE \`text\` IS NOT NULL;`)
  await db.run(sql`ALTER TABLE \`presets_blocks_hero\` DROP COLUMN \`title\`;`)
  await db.run(sql`ALTER TABLE \`presets_blocks_hero\` DROP COLUMN \`description\`;`)
  await db.run(sql`ALTER TABLE \`presets_blocks_copy\` DROP COLUMN \`text\`;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`presets_blocks_hero\` ADD \`title\` text NOT NULL DEFAULT '';`)
  await db.run(sql`ALTER TABLE \`presets_blocks_hero\` ADD \`description\` text;`)
  await db.run(sql`ALTER TABLE \`presets_blocks_copy\` ADD \`text\` text NOT NULL DEFAULT '';`)
  await db.run(sql`UPDATE \`presets_blocks_hero\` SET
    \`title\` = COALESCE((SELECT \`title\` FROM \`presets_blocks_hero_locales\` WHERE \`_parent_id\` = \`presets_blocks_hero\`.\`id\` AND \`_locale\` = 'en'), ''),
    \`description\` = (SELECT \`description\` FROM \`presets_blocks_hero_locales\` WHERE \`_parent_id\` = \`presets_blocks_hero\`.\`id\` AND \`_locale\` = 'en');`)
  await db.run(sql`UPDATE \`presets_blocks_copy\` SET
    \`text\` = COALESCE((SELECT \`text\` FROM \`presets_blocks_copy_locales\` WHERE \`_parent_id\` = \`presets_blocks_copy\`.\`id\` AND \`_locale\` = 'en'), '');`)
  await db.run(sql`DROP TABLE \`presets_blocks_hero_locales\`;`)
  await db.run(sql`DROP TABLE \`presets_blocks_copy_locales\`;`)
}
