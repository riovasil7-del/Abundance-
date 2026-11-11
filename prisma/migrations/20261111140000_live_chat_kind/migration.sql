-- Join lines in the live chat overlay. Existing rows stay ordinary chat.

ALTER TABLE "LiveMessage" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'chat';

CREATE TABLE "LiveChatMute" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveChatMute_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LiveChatMute_sessionId_userId_key" ON "LiveChatMute"("sessionId", "userId");
ALTER TABLE "LiveChatMute" ADD CONSTRAINT "LiveChatMute_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveChatMute" ADD CONSTRAINT "LiveChatMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
