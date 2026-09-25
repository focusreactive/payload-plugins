import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Replaces the admin/author/user roles with administrator/globalEditor/marketEditor/feeEarner.
 * Hand-written because the migration Payload generates for a changed enum drops and recreates
 * the type with no mapping, which fails on (or wipes) every existing row. The column goes to text,
 * the rows are mapped, then the new enum is put back. An author told apart only by having markets
 * becomes a market editor; one with none was the international editor and becomes a global editor.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
   ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;
   UPDATE "users" SET "role" = CASE
     WHEN "role" = 'admin' THEN 'administrator'
     WHEN "role" = 'user' THEN 'feeEarner'
     WHEN "role" = 'author' AND EXISTS (SELECT 1 FROM "users_markets" WHERE "users_markets"."parent_id" = "users"."id") THEN 'marketEditor'
     WHEN "role" = 'author' THEN 'globalEditor'
     ELSE "role"
   END;
   DROP TYPE "public"."enum_users_role";
   CREATE TYPE "public"."enum_users_role" AS ENUM('administrator', 'globalEditor', 'marketEditor', 'feeEarner');
   ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."enum_users_role" USING "role"::"public"."enum_users_role";
   ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'feeEarner';
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
   ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;
   UPDATE "users" SET "role" = CASE
     WHEN "role" = 'administrator' THEN 'admin'
     WHEN "role" = 'feeEarner' THEN 'user'
     ELSE 'author'
   END;
   DROP TYPE "public"."enum_users_role";
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'author', 'user');
   ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."enum_users_role" USING "role"::"public"."enum_users_role";
   ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';
  `)
}
