-- DropForeignKey
ALTER TABLE "UserAction" DROP CONSTRAINT "UserAction_pollId_fkey";

-- DropForeignKey
ALTER TABLE "Vote" DROP CONSTRAINT "Vote_pollId_fkey";

-- AddForeignKey
ALTER TABLE "UserAction" ADD CONSTRAINT "UserAction_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("pollId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("pollId") ON DELETE CASCADE ON UPDATE CASCADE;
