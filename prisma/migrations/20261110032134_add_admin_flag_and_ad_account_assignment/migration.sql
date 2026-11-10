-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AdAccountAssignment" (
    "id" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "adAccountName" TEXT,
    "userId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "AdAccountAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdAccountAssignment_adAccountId_key" ON "AdAccountAssignment"("adAccountId");

-- CreateIndex
CREATE INDEX "AdAccountAssignment_userId_idx" ON "AdAccountAssignment"("userId");

-- AddForeignKey
ALTER TABLE "AdAccountAssignment" ADD CONSTRAINT "AdAccountAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
