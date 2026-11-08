-- AlterTable
ALTER TABLE "DashboardConfig" ADD COLUMN     "lastAttentionAlertAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MetaConnection" ADD COLUMN     "businessId" TEXT,
ADD COLUMN     "businessPortfolioName" TEXT,
ADD COLUMN     "lastAccessLostAlertAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncStatus" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "businessWebsite" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "monthlySpendCap" DOUBLE PRECISION,
ADD COLUMN     "notifyMetaAccessLost" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyNeedsAttention" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyWeeklySummary" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "EmailChangeToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailChangeToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailChangeToken_tokenHash_key" ON "EmailChangeToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailChangeToken_userId_idx" ON "EmailChangeToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- AddForeignKey
ALTER TABLE "EmailChangeToken" ADD CONSTRAINT "EmailChangeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
