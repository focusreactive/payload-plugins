import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_review_status" AS ENUM('in_progress', 'ready_for_review', 'approved');
  CREATE TYPE "public"."enum__page_v_version_review_status" AS ENUM('in_progress', 'ready_for_review', 'approved');
  CREATE TYPE "public"."enum_posts_review_status" AS ENUM('in_progress', 'ready_for_review', 'approved');
  CREATE TYPE "public"."enum__posts_v_version_review_status" AS ENUM('in_progress', 'ready_for_review', 'approved');
  ALTER TABLE "page" ADD COLUMN "review_status" "enum_page_review_status" DEFAULT 'in_progress';
  ALTER TABLE "page" ADD COLUMN "reviewer_id" integer;
  ALTER TABLE "page" ADD COLUMN "review_requested_by_id" integer;
  ALTER TABLE "_page_v" ADD COLUMN "version_review_status" "enum__page_v_version_review_status" DEFAULT 'in_progress';
  ALTER TABLE "_page_v" ADD COLUMN "version_reviewer_id" integer;
  ALTER TABLE "_page_v" ADD COLUMN "version_review_requested_by_id" integer;
  ALTER TABLE "posts" ADD COLUMN "review_status" "enum_posts_review_status" DEFAULT 'in_progress';
  ALTER TABLE "posts" ADD COLUMN "reviewer_id" integer;
  ALTER TABLE "posts" ADD COLUMN "review_requested_by_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_review_status" "enum__posts_v_version_review_status" DEFAULT 'in_progress';
  ALTER TABLE "_posts_v" ADD COLUMN "version_reviewer_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_review_requested_by_id" integer;
  ALTER TABLE "page" ADD CONSTRAINT "page_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page" ADD CONSTRAINT "page_review_requested_by_id_users_id_fk" FOREIGN KEY ("review_requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v" ADD CONSTRAINT "_page_v_version_reviewer_id_users_id_fk" FOREIGN KEY ("version_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v" ADD CONSTRAINT "_page_v_version_review_requested_by_id_users_id_fk" FOREIGN KEY ("version_review_requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_review_requested_by_id_users_id_fk" FOREIGN KEY ("review_requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_reviewer_id_users_id_fk" FOREIGN KEY ("version_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_review_requested_by_id_users_id_fk" FOREIGN KEY ("version_review_requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "page_reviewer_idx" ON "page" USING btree ("reviewer_id");
  CREATE INDEX "page_review_requested_by_idx" ON "page" USING btree ("review_requested_by_id");
  CREATE INDEX "_page_v_version_version_reviewer_idx" ON "_page_v" USING btree ("version_reviewer_id");
  CREATE INDEX "_page_v_version_version_review_requested_by_idx" ON "_page_v" USING btree ("version_review_requested_by_id");
  CREATE INDEX "posts_reviewer_idx" ON "posts" USING btree ("reviewer_id");
  CREATE INDEX "posts_review_requested_by_idx" ON "posts" USING btree ("review_requested_by_id");
  CREATE INDEX "_posts_v_version_version_reviewer_idx" ON "_posts_v" USING btree ("version_reviewer_id");
  CREATE INDEX "_posts_v_version_version_review_requested_by_idx" ON "_posts_v" USING btree ("version_review_requested_by_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page" DROP CONSTRAINT "page_reviewer_id_users_id_fk";
  
  ALTER TABLE "page" DROP CONSTRAINT "page_review_requested_by_id_users_id_fk";
  
  ALTER TABLE "_page_v" DROP CONSTRAINT "_page_v_version_reviewer_id_users_id_fk";
  
  ALTER TABLE "_page_v" DROP CONSTRAINT "_page_v_version_review_requested_by_id_users_id_fk";
  
  ALTER TABLE "posts" DROP CONSTRAINT "posts_reviewer_id_users_id_fk";
  
  ALTER TABLE "posts" DROP CONSTRAINT "posts_review_requested_by_id_users_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_reviewer_id_users_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_review_requested_by_id_users_id_fk";
  
  DROP INDEX "page_reviewer_idx";
  DROP INDEX "page_review_requested_by_idx";
  DROP INDEX "_page_v_version_version_reviewer_idx";
  DROP INDEX "_page_v_version_version_review_requested_by_idx";
  DROP INDEX "posts_reviewer_idx";
  DROP INDEX "posts_review_requested_by_idx";
  DROP INDEX "_posts_v_version_version_reviewer_idx";
  DROP INDEX "_posts_v_version_version_review_requested_by_idx";
  ALTER TABLE "page" DROP COLUMN "review_status";
  ALTER TABLE "page" DROP COLUMN "reviewer_id";
  ALTER TABLE "page" DROP COLUMN "review_requested_by_id";
  ALTER TABLE "_page_v" DROP COLUMN "version_review_status";
  ALTER TABLE "_page_v" DROP COLUMN "version_reviewer_id";
  ALTER TABLE "_page_v" DROP COLUMN "version_review_requested_by_id";
  ALTER TABLE "posts" DROP COLUMN "review_status";
  ALTER TABLE "posts" DROP COLUMN "reviewer_id";
  ALTER TABLE "posts" DROP COLUMN "review_requested_by_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_review_status";
  ALTER TABLE "_posts_v" DROP COLUMN "version_reviewer_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_review_requested_by_id";
  DROP TYPE "public"."enum_page_review_status";
  DROP TYPE "public"."enum__page_v_version_review_status";
  DROP TYPE "public"."enum_posts_review_status";
  DROP TYPE "public"."enum__posts_v_version_review_status";`)
}
