-- Text stories and private drafts. A public video is not required.
-- Photo originals are not given a column: only a processed PNG key is stored.

ALTER TABLE "Video" ALTER COLUMN "storageKey" DROP NOT NULL;
ALTER TABLE "Video" ALTER COLUMN "playbackUrl" DROP NOT NULL;
ALTER TABLE "Video" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "Video" ADD COLUMN "mediaKind" TEXT NOT NULL DEFAULT 'VIDEO';
ALTER TABLE "Video" ADD COLUMN "peopleNote" TEXT;

CREATE INDEX "Video_visibility_moderationStatus_createdAt_idx" ON "Video"("visibility", "moderationStatus", "createdAt");
