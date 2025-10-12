/*
  Warnings:

  - You are about to drop the column `token` on the `share_links` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."share_links_token_key";

-- AlterTable
ALTER TABLE "public"."share_links" DROP COLUMN "token";
