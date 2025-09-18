/*
  Warnings:

  - You are about to drop the column `bucket` on the `files` table. All the data in the column will be lost.
  - You are about to drop the column `storage_path` on the `files` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."files" DROP COLUMN "bucket",
DROP COLUMN "storage_path";
