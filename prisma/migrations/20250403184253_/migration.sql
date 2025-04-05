/*
  Warnings:

  - You are about to drop the column `actionID` on the `UserAction` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "UserAction_actionID_key";

-- AlterTable
ALTER TABLE "UserAction" DROP COLUMN "actionID";
