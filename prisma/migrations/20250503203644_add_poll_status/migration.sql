-- CreateEnum
CREATE TYPE "PollStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Poll" ADD COLUMN     "status" "PollStatus" NOT NULL DEFAULT 'PUBLISHED';
