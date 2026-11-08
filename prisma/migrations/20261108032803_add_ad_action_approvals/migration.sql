-- CreateTable
CREATE TABLE "ad_action_approvals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "objectId" TEXT,
    "budget" TEXT,
    "termsVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_action_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ad_action_approvals_userId_createdAt_idx" ON "ad_action_approvals"("userId", "createdAt");
