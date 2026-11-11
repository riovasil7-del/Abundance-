-- Feed language, topic preferences, hides, and a country-level taste.
-- No coordinates. No gift or watch-time columns.

ALTER TABLE "Video" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';

CREATE INDEX "Video_moderationStatus_createdAt_idx" ON "Video"("moderationStatus", "createdAt");
CREATE INDEX "Video_deedKind_createdAt_idx" ON "Video"("deedKind", "createdAt");
CREATE INDEX "Video_creatorId_createdAt_idx" ON "Video"("creatorId", "createdAt");

CREATE TABLE "TopicPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "interested" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TopicPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TopicPreference_userId_topic_key" ON "TopicPreference"("userId", "topic");
CREATE INDEX "TopicPreference_userId_idx" ON "TopicPreference"("userId");
ALTER TABLE "TopicPreference" ADD CONSTRAINT "TopicPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FeedHide" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeedHide_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FeedHide_userId_creatorId_key" ON "FeedHide"("userId", "creatorId");
CREATE INDEX "FeedHide_userId_idx" ON "FeedHide"("userId");
ALTER TABLE "FeedHide" ADD CONSTRAINT "FeedHide_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeedHide" ADD CONSTRAINT "FeedHide_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FeedTaste" (
    "userId" TEXT NOT NULL,
    "languages" TEXT[],
    "regionCode" TEXT,
    CONSTRAINT "FeedTaste_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "FeedTaste" ADD CONSTRAINT "FeedTaste_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
