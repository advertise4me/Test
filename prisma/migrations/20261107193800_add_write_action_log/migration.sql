-- CreateTable
CREATE TABLE "WriteActionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WriteActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WriteActionLog_userId_createdAt_idx" ON "WriteActionLog"("userId", "createdAt");
