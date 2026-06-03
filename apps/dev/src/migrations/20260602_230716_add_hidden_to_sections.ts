import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-sqlite";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`pages_blocks_hero\` ADD \`_hidden\` integer DEFAULT false;`);
  await db.run(sql`ALTER TABLE \`pages_blocks_copy\` ADD \`_hidden\` integer DEFAULT false;`);
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_hero\` ADD \`_hidden\` integer DEFAULT false;`);
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_copy\` ADD \`_hidden\` integer DEFAULT false;`);
  await db.run(sql`ALTER TABLE \`presets_blocks_hero\` ADD \`_hidden\` integer DEFAULT false;`);
  await db.run(sql`ALTER TABLE \`presets_blocks_copy\` ADD \`_hidden\` integer DEFAULT false;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`pages_blocks_hero\` DROP COLUMN \`_hidden\`;`);
  await db.run(sql`ALTER TABLE \`pages_blocks_copy\` DROP COLUMN \`_hidden\`;`);
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_hero\` DROP COLUMN \`_hidden\`;`);
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_copy\` DROP COLUMN \`_hidden\`;`);
  await db.run(sql`ALTER TABLE \`presets_blocks_hero\` DROP COLUMN \`_hidden\`;`);
  await db.run(sql`ALTER TABLE \`presets_blocks_copy\` DROP COLUMN \`_hidden\`;`);
}
