-- Low-data choice, typed captions, and one receipt per story upload token.

ALTER TABLE "User" ADD COLUMN "lowData" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Video" ADD COLUMN "captionsVtt" TEXT;

CREATE TABLE "StoryReceipt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoryReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StoryReceipt_userId_token_key" ON "StoryReceipt"("userId", "token");
CREATE INDEX "StoryReceipt_storyId_idx" ON "StoryReceipt"("storyId");
ALTER TABLE "StoryReceipt" ADD CONSTRAINT "StoryReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
