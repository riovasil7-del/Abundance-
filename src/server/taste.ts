import { CRAFT_KEYS, DEED_KINDS, isLocale, type Locale } from "../config/app";
import { db } from "./db";

const TOPICS = new Set<string>([...DEED_KINDS, ...CRAFT_KEYS]);

export function preferenceDecision(user: { id: string } | null | undefined): "OK" | "UNAUTHENTICATED" {
  return user?.id ? "OK" : "UNAUTHENTICATED";
}

export function parseTopic(topic: string): string | null {
  return TOPICS.has(topic) ? topic : null;
}

export function parseLanguages(values: readonly string[]): Locale[] | null {
  if (values.length > 4) return null;
  const out: Locale[] = [];
  for (const value of values) {
    if (!isLocale(value) || out.includes(value)) return null;
    out.push(value);
  }
  return out;
}

export function parseRegion(value: string | null): string | null | "INVALID" {
  if (value == null || value === "") return null;
  if (/^[A-Z]{2}$/.test(value)) return value;
  return "INVALID";
}

export async function readTaste(userId: string) {
  const [taste, topics, hides] = await Promise.all([
    db.feedTaste.findUnique({ where: { userId } }),
    db.topicPreference.findMany({ where: { userId }, orderBy: { topic: "asc" } }),
    db.feedHide.findMany({ where: { userId }, include: { creator: { select: { id: true, displayName: true, slug: true } } } }),
  ]);
  return {
    languages: taste?.languages ?? [],
    regionCode: taste?.regionCode ?? null,
    topics: topics.map((row) => ({ topic: row.topic, interested: row.interested })),
    hides: hides.map((row) => ({ creatorId: row.creatorId, name: row.creator.displayName, slug: row.creator.slug })),
  };
}

export async function setTopic(userId: string, topic: string, interested: boolean) {
  return db.topicPreference.upsert({
    where: { userId_topic: { userId, topic } },
    create: { userId, topic, interested },
    update: { interested },
  });
}

export async function hideCreator(userId: string, creatorId: string) {
  const creator = await db.creatorProfile.findUnique({ where: { id: creatorId }, select: { id: true } });
  if (!creator) return { error: "NOT_FOUND" as const };
  await db.feedHide.upsert({
    where: { userId_creatorId: { userId, creatorId } },
    create: { userId, creatorId },
    update: {},
  });
  return { ok: true as const };
}

export async function unhideCreator(userId: string, creatorId: string) {
  await db.feedHide.deleteMany({ where: { userId, creatorId } });
}

export async function setLanguages(userId: string, languages: readonly string[]) {
  await db.feedTaste.upsert({
    where: { userId },
    create: { userId, languages: [...languages] },
    update: { languages: [...languages] },
  });
}

export async function setRegion(userId: string, regionCode: string | null) {
  await db.feedTaste.upsert({
    where: { userId },
    create: { userId, languages: [], regionCode },
    update: { regionCode },
  });
}

export async function resetTaste(userId: string) {
  await db.$transaction([
    db.topicPreference.deleteMany({ where: { userId } }),
    db.feedHide.deleteMany({ where: { userId } }),
    db.feedTaste.deleteMany({ where: { userId } }),
  ]);
}
