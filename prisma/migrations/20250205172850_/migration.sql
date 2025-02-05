-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "worldId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_worldId_key" ON "User"("worldId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
