import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_markets" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TABLE "users_markets" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_markets",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "users_markets" ADD CONSTRAINT "users_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_markets_order_idx" ON "users_markets" USING btree ("order");
  CREATE INDEX "users_markets_parent_idx" ON "users_markets" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_markets" CASCADE;
  DROP TYPE "public"."enum_users_markets";`)
}
