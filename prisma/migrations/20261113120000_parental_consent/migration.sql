-- Self-declared age answer and a parent link. Not an identity document.
ALTER TABLE "User" ADD COLUMN "minorDeclaredAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "birthDate" DATE;

CREATE TABLE "ParentalConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentEmail" TEXT NOT NULL,
    "parentName" TEXT,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "guardianConfirmed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ParentalConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentalConsent_userId_key" ON "ParentalConsent"("userId");
CREATE UNIQUE INDEX "ParentalConsent_tokenHash_key" ON "ParentalConsent"("tokenHash");

ALTER TABLE "ParentalConsent" ADD CONSTRAINT "ParentalConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
