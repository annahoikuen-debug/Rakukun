-- AlterTable: MFA (login-time second factor + recovery codes)
ALTER TABLE "User" ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "mfaSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "mfaConfirmedAt" TIMESTAMP(3);

-- AlterTable: Stripe subscription state + partner (agency) parent tenant
ALTER TABLE "Tenant" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "stripePriceId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "parentId" TEXT;

-- AlterTable: stable public token for training result links (opaque rid)
ALTER TABLE "TrainingResult" ADD COLUMN "publicToken" TEXT;

-- CreateTable: Amazon SES bounce/complaint/delivery events
CREATE TABLE "SesEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "messageId" TEXT,
    "email" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "payload" JSONB,

    CONSTRAINT "SesEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: suppressed recipients (global by email, see schema comment)
CREATE TABLE "SuppressedEmail" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tenantId" TEXT,
    "reason" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuppressedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MFA recovery codes (hashed, single-use)
CREATE TABLE "MfaRecoveryCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable: processed Stripe webhook events (idempotency)
CREATE TABLE "ProcessedStripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedStripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: security audit log
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Membership_tenantId_idx" ON "Membership"("tenantId");

-- CreateIndex
CREATE INDEX "TrainingCampaign_tenantId_idx" ON "TrainingCampaign"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingResult_publicToken_key" ON "TrainingResult"("publicToken");

-- CreateIndex
CREATE INDEX "TrainingResult_targetEmployeeId_idx" ON "TrainingResult"("targetEmployeeId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "SesEvent_email_idx" ON "SesEvent"("email");

-- CreateIndex
CREATE INDEX "SesEvent_eventType_idx" ON "SesEvent"("eventType");

-- CreateIndex
CREATE INDEX "SesEvent_timestamp_idx" ON "SesEvent"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "SuppressedEmail_email_key" ON "SuppressedEmail"("email");

-- CreateIndex
CREATE INDEX "SuppressedEmail_tenantId_idx" ON "SuppressedEmail"("tenantId");

-- CreateIndex
CREATE INDEX "MfaRecoveryCode_userId_idx" ON "MfaRecoveryCode"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuppressedEmail" ADD CONSTRAINT "SuppressedEmail_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaRecoveryCode" ADD CONSTRAINT "MfaRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
