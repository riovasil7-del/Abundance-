import { unlink } from "node:fs/promises";
import { DEED_KINDS } from "../config/app";
import { mediaPublishDecision } from "../lib/low-data";
import { db } from "./db";
import { reviewComment } from "./moderation";
import { parseRegions, redactImage, type CoverRegion } from "./redact";
import { getVideoStorage, resolveUploadPath } from "./storage";

export const STORY_VISIBILITY = ["DRAFT", "PRIVATE", "PUBLISHED"] as const;
export type StoryVisibility = (typeof STORY_VISIBILITY)[number];

export function storyAccess(
  actorId: string | null,
  ownerUserId: string,
  visibility: string,
  moderation: string,
): "OWNER" | "PUBLIC" | "HIDDEN" {
  if (actorId && actorId === ownerUserId) return "OWNER";
  if (visibility === "PUBLISHED" && moderation === "VISIBLE") return "PUBLIC";
  return "HIDDEN";
}

export function parseVisibility(value: string): StoryVisibility | null {
  return (STORY_VISIBILITY as readonly string[]).includes(value) ? (value as StoryVisibility) : null;
}

export function parseDeed(value: string): (typeof DEED_KINDS)[number] | null {
  return (DEED_KINDS as readonly string[]).includes(value) ? (value as (typeof DEED_KINDS)[number]) : null;
}

async function owned(actorId: string, storyId: string) {
  const story = await db.video.findUnique({ where: { id: storyId }, include: { creator: true } });
  if (!story) return { error: "NOT_FOUND" as const };
  if (story.creator.userId !== actorId) return { error: "FORBIDDEN" as const };
  return { story };
}

async function existingReceipt(userId: string, token: string | undefined) {
  if (!token) return null;
  return db.storyReceipt.findUnique({ where: { userId_token: { userId, token } } });
}

export async function createTextStory(input: {
  actorId: string;
  creatorId: string;
  title: string;
  caption: string;
  deedKind: string;
  visibility: StoryVisibility;
  circleId?: string | null;
  clientToken?: string;
}) {
  const prior = await existingReceipt(input.actorId, input.clientToken);
  if (prior) {
    const story = await db.video.findUnique({ where: { id: prior.storyId } });
    if (story) return { story, status: story.moderationStatus, replayed: true as const };
  }
  const review = reviewComment(`${input.title}\n${input.caption}`);
  const story = await db.video.create({
    data: {
      creatorId: input.creatorId,
      title: input.title,
      caption: input.caption,
      deedKind: input.deedKind,
      circleId: input.circleId ?? null,
      storageKey: null,
      playbackUrl: null,
      visibility: input.visibility,
      mediaKind: "NONE",
      peopleNote: "TEXT_ONLY",
      consentConfirmed: false,
      moderationStatus: review.status === "VISIBLE" ? "VISIBLE" : "FLAGGED",
    },
  });
  if (input.clientToken) {
    await db.storyReceipt.create({ data: { userId: input.actorId, token: input.clientToken, storyId: story.id } });
  }
  return { story, status: story.moderationStatus, replayed: false as const };
}

export async function createPhotoStory(input: {
  actorId: string;
  creatorId: string;
  title: string;
  caption: string;
  deedKind: string;
  visibility: StoryVisibility;
  peopleNote: "NO_FACES" | "COVERED";
  reviewed: boolean;
  bytes: Buffer;
  regions: unknown;
  circleId?: string | null;
  clientToken?: string;
}) {
  const prior = await existingReceipt(input.actorId, input.clientToken);
  if (prior) {
    const story = await db.video.findUnique({ where: { id: prior.storyId } });
    if (story) return { story, status: story.moderationStatus, replayed: true as const };
  }
  if (mediaPublishDecision() === "blocked") return { error: "MEDIA_BLOCKED" as const };
  if (input.visibility === "PUBLISHED" && !input.reviewed) return { error: "REVIEW_REQUIRED" as const };
  const regions: CoverRegion[] = parseRegions(input.regions, input.peopleNote === "COVERED");
  const png = redactImage(input.bytes, regions);
  const storage = getVideoStorage();
  if (!storage.saveProcessed) return { error: "STORAGE_NOT_CONFIGURED" as const };
  const stored = await storage.saveProcessed(png);
  const review = reviewComment(`${input.title}\n${input.caption}`);
  const story = await db.video.create({
    data: {
      creatorId: input.creatorId,
      title: input.title,
      caption: input.caption,
      deedKind: input.deedKind,
      circleId: input.circleId ?? null,
      storageKey: stored.key,
      playbackUrl: stored.playbackUrl,
      visibility: input.visibility,
      mediaKind: "PHOTO",
      peopleNote: input.peopleNote,
      consentConfirmed: false,
      moderationStatus: review.status === "VISIBLE" ? "VISIBLE" : "FLAGGED",
    },
  });
  if (input.clientToken) {
    await db.storyReceipt.create({ data: { userId: input.actorId, token: input.clientToken, storyId: story.id } });
  }
  return { story, status: story.moderationStatus, png, replayed: false as const };
}

export async function updateStory(
  actorId: string,
  storyId: string,
  patch: { title?: string; caption?: string; visibility?: StoryVisibility; captionsVtt?: string | null },
) {
  const found = await owned(actorId, storyId);
  if ("error" in found) return found;
  if (patch.visibility === "PUBLISHED" && found.story.mediaKind === "PHOTO" && found.story.peopleNote === "COVERED" && !found.story.playbackUrl) {
    return { error: "REVIEW_REQUIRED" as const };
  }
  const nextTitle = patch.title?.trim() || found.story.title;
  const nextCaption = patch.caption?.trim() || found.story.caption;
  const review = reviewComment(`${nextTitle}\n${nextCaption}`);
  const story = await db.video.update({
    where: { id: storyId },
    data: {
      title: nextTitle,
      caption: nextCaption,
      ...(patch.visibility ? { visibility: patch.visibility } : {}),
      ...(patch.captionsVtt !== undefined ? { captionsVtt: patch.captionsVtt } : {}),
      moderationStatus: review.status === "VISIBLE" ? "VISIBLE" : "FLAGGED",
    },
  });
  return { story };
}

export async function deleteStory(actorId: string, storyId: string) {
  const found = await owned(actorId, storyId);
  if ("error" in found) return found;
  await db.video.delete({ where: { id: storyId } });
  if (found.story.storageKey && found.story.mediaKind === "PHOTO") {
    const full = resolveUploadPath(found.story.storageKey);
    if (full) await unlink(full).catch(() => undefined);
  }
  return { ok: true as const };
}

export async function readStory(actorId: string | null, storyId: string) {
  const story = await db.video.findUnique({ where: { id: storyId }, include: { creator: true } });
  if (!story) return { error: "NOT_FOUND" as const };
  const access = storyAccess(actorId, story.creator.userId, story.visibility, story.moderationStatus);
  if (access === "HIDDEN") return { error: "NOT_FOUND" as const };
  return { story, access };
}
