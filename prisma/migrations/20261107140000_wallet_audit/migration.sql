-- AlterEnum
ALTER TYPE "LedgerStatus" ADD VALUE 'FROZEN';

-- AlterTable
ALTER TABLE "CreditEntry" ADD COLUMN "stripePaymentIntentId" TEXT;

-- CreateTable
CREATE TABLE "MoneyEvent" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT,
    "kind" TEXT NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "stripeEventId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMarker" (
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMarker_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AccountReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reversedCents" INTEGER NOT NULL,
    "frozenCents" INTEGER NOT NULL,
    "reviewCents" INTEGER NOT NULL,
    "stripeEventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MoneyEvent_stripeEventId_key" ON "MoneyEvent"("stripeEventId");
CREATE INDEX "MoneyEvent_transactionId_idx" ON "MoneyEvent"("transactionId");
CREATE UNIQUE INDEX "CreditEntry_stripePaymentIntentId_key" ON "CreditEntry"("stripePaymentIntentId");
CREATE UNIQUE INDEX "AccountReview_stripeEventId_key" ON "AccountReview"("stripeEventId");
CREATE INDEX "AccountReview_userId_status_idx" ON "AccountReview"("userId", "status");

-- AddForeignKey
ALTER TABLE "MoneyEvent" ADD CONSTRAINT "MoneyEvent_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountReview" ADD CONSTRAINT "AccountReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyEvent" ADD CONSTRAINT "money_event_conserves" CHECK ("grossCents" >= 0 AND "feeCents" >= 0 AND "netCents" >= 0 AND "feeCents" + "netCents" = "grossCents");
ALTER TABLE "AccountReview" ADD CONSTRAINT "account_review_nonnegative" CHECK ("reversedCents" >= 0 AND "frozenCents" >= 0 AND "reviewCents" >= 0);

-- Amounts already written cannot be edited. Status may still move (held, frozen).
CREATE OR REPLACE FUNCTION "ledger_amounts_immutable"() RETURNS trigger AS $$
BEGIN
  IF NEW."grossCents" IS DISTINCT FROM OLD."grossCents"
     OR NEW."feeCents" IS DISTINCT FROM OLD."feeCents"
     OR NEW."netCents" IS DISTINCT FROM OLD."netCents"
     OR NEW."currency" IS DISTINCT FROM OLD."currency" THEN
    RAISE EXCEPTION 'LEDGER_AMOUNTS_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ledger_amounts_immutable"
BEFORE UPDATE ON "LedgerTransaction"
FOR EACH ROW EXECUTE FUNCTION "ledger_amounts_immutable"();
