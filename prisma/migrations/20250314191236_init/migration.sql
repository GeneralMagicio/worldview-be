-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('CREATED', 'VOTED');

-- CreateTable
CREATE TABLE "User" (
    "worldID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profilePicture" TEXT,
    "pollsCreatedCount" INTEGER NOT NULL DEFAULT 0,
    "pollsParticipatedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("worldID")
);

-- CreateTable
CREATE TABLE "UserAction" (
    "id" TEXT NOT NULL,
    "worldID" TEXT NOT NULL,
    "actionID" TEXT NOT NULL,
    "pollID" TEXT NOT NULL,
    "type" "ActionType" NOT NULL,

    CONSTRAINT "UserAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poll" (
    "pollID" TEXT NOT NULL,
    "authorUserID" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "options" TEXT[],
    "creationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "tags" TEXT[],
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "voteResults" JSONB NOT NULL,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("pollID")
);

-- CreateTable
CREATE TABLE "Vote" (
    "voteID" TEXT NOT NULL,
    "worldID" TEXT NOT NULL,
    "pollID" TEXT NOT NULL,
    "votingPower" INTEGER NOT NULL,
    "weightDistribution" JSONB NOT NULL,
    "proof" TEXT NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("voteID")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAction_actionID_key" ON "UserAction"("actionID");

-- AddForeignKey
ALTER TABLE "UserAction" ADD CONSTRAINT "UserAction_worldID_fkey" FOREIGN KEY ("worldID") REFERENCES "User"("worldID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_authorUserID_fkey" FOREIGN KEY ("authorUserID") REFERENCES "User"("worldID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_worldID_fkey" FOREIGN KEY ("worldID") REFERENCES "User"("worldID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_pollID_fkey" FOREIGN KEY ("pollID") REFERENCES "Poll"("pollID") ON DELETE CASCADE ON UPDATE CASCADE;
