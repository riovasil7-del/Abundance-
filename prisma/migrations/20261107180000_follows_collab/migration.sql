-- Follows, in-app updates, private notes, and live co-host invites.
-- Additive only. No change to ledger amounts or the 15/85 split.

CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Follow_followerId_creatorId_key" ON "Follow"("followerId", "creatorId");
CREATE INDEX "Follow_creatorId_idx" ON "Follow"("creatorId");

ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CreatorUpdate" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreatorUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreatorUpdate_creatorId_createdAt_idx" ON "CreatorUpdate"("creatorId", "createdAt");
ALTER TABLE "CreatorUpdate" ADD CONSTRAINT "CreatorUpdate_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Encouragement" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Encouragement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Encouragement_toUserId_createdAt_idx" ON "Encouragement"("toUserId", "createdAt");
ALTER TABLE "Encouragement" ADD CONSTRAINT "Encouragement_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Encouragement" ADD CONSTRAINT "Encouragement_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LiveInvite" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "consentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LiveInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiveInvite_sessionId_inviteeId_key" ON "LiveInvite"("sessionId", "inviteeId");
CREATE INDEX "LiveInvite_inviteeId_status_idx" ON "LiveInvite"("inviteeId", "status");
ALTER TABLE "LiveInvite" ADD CONSTRAINT "LiveInvite_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveInvite" ADD CONSTRAINT "LiveInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
