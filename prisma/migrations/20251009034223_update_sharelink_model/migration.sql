/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `share_links` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `duration` to the `share_links` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token` to the `share_links` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."share_links" ADD COLUMN     "duration" TEXT NOT NULL,
ADD COLUMN     "token" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "public"."share_links"("token");
