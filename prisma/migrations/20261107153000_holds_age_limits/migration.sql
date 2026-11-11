-- AlterTable
ALTER TABLE "User" ADD COLUMN "adultAttestedAt" TIMESTAMP(3);
ALTER TABLE "AccountReview" ADD COLUMN "packEntryId" TEXT;
ALTER TABLE "LedgerTransaction" ADD COLUMN "sandbox" BOOLEAN NOT NULL DEFAULT false;

-- Existing demo and credit gifts were not real payouts. Stripe is not configured.
UPDATE "LedgerTransaction" SET "sandbox" = true WHERE "paymentMode" IN ('DEMO', 'CREDITS');

-- CreateTable
CREATE TABLE "CreditAllocation" (
    "id" TEXT NOT NULL,
    "packEntryId" TEXT NOT NULL,
    "spendEntryId" TEXT,
    "reversalEntryId" TEXT,
    "lights" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditRelease" (
    "id" TEXT NOT NULL,
    "packEntryId" TEXT NOT NULL,
    "lights" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditRelease_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayoutReservation" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "transactionId" TEXT,
    "packEntryId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "generation" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayoutReservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentCase" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "paymentIntentId" TEXT,
    "userId" TEXT,
    "packEntryId" TEXT,
    "refunded" BOOLEAN NOT NULL DEFAULT false,
    "held" BOOLEAN NOT NULL DEFAULT false,
    "restored" BOOLEAN NOT NULL DEFAULT false,
    "dispute" TEXT,
    "generation" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimitHit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreditRelease_idempotencyKey_key" ON "CreditRelease"("idempotencyKey");
CREATE UNIQUE INDEX "PayoutReservation_idempotencyKey_key" ON "PayoutReservation"("idempotencyKey");
CREATE UNIQUE INDEX "PaymentCase_sessionId_key" ON "PaymentCase"("sessionId");
CREATE UNIQUE INDEX "PaymentCase_paymentIntentId_key" ON "PaymentCase"("paymentIntentId");
CREATE INDEX "CreditAllocation_packEntryId_idx" ON "CreditAllocation"("packEntryId");
CREATE INDEX "CreditAllocation_spendEntryId_idx" ON "CreditAllocation"("spendEntryId");
CREATE INDEX "CreditRelease_packEntryId_idx" ON "CreditRelease"("packEntryId");
CREATE INDEX "PayoutReservation_creatorId_status_idx" ON "PayoutReservation"("creatorId", "status");
CREATE INDEX "PayoutReservation_packEntryId_status_idx" ON "PayoutReservation"("packEntryId", "status");
CREATE INDEX "RateLimitHit_key_createdAt_idx" ON "RateLimitHit"("key", "createdAt");

ALTER TABLE "CreditAllocation" ADD CONSTRAINT "CreditAllocation_packEntryId_fkey" FOREIGN KEY ("packEntryId") REFERENCES "CreditEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditRelease" ADD CONSTRAINT "CreditRelease_packEntryId_fkey" FOREIGN KEY ("packEntryId") REFERENCES "CreditEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayoutReservation" ADD CONSTRAINT "PayoutReservation_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayoutReservation" ADD CONSTRAINT "PayoutReservation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CreditAllocation" ADD CONSTRAINT "credit_allocation_positive" CHECK ("lights" > 0);
ALTER TABLE "CreditRelease" ADD CONSTRAINT "credit_release_positive" CHECK ("lights" > 0);
ALTER TABLE "PayoutReservation" ADD CONSTRAINT "payout_reservation_positive" CHECK ("amountCents" > 0);
