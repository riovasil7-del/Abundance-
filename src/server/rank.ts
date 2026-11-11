/**
 * For You order. Gift spend and watch time are not inputs.
 * The same items and the same viewer always produce the same order.
 */

export const PAGE_SIZE = 4;
/** One exploration slot in every block of this many items: 1/4 of the page. */
export const EXPLORATION_EVERY = 4;
export const FAIRNESS_WINDOW = 4;
export const MAX_PER_CREATOR_WINDOW = 2;
/** A creator with fewer kindness marks than this is treated as new. */
export const LOW_EXPOSURE = 1;

export const COMMUNITY_DEEDS = ["good_deed", "craft", "gratitude"] as const;

export type ReasonCode =
  | "recent"
  | "language"
  | "region"
  | "interest"
  | "community"
  | "followed"
  | "newCreator"
  | "kindness"
  | "quietReports";

export type RankCandidate = {
  id: string;
  creatorId: string;
  creatorUserId: string;
  createdAtMs: number;
  deedKind: string;
  craftKey: string;
  countryCode: string;
  contentLanguage: string;
  blessingCount: number;
  commentCount: number;
  reportCount: number;
  /** Accepted so a test can prove the number never changes the score. */
  giftCents: number;
  circle: boolean;
};

export type RankViewer = {
  languages: readonly string[];
  regionCode: string | null;
  interested: readonly string[];
  notInterested: readonly string[];
  nowMs: number;
};

export type Ranked = {
  id: string;
  creatorId: string;
  score: number;
  reasons: ReasonCode[];
};

type Scored = Ranked & { item: RankCandidate; fresh: boolean };

export function isCommunity(item: Pick<RankCandidate, "deedKind" | "circle">): boolean {
  return item.circle || (COMMUNITY_DEEDS as readonly string[]).includes(item.deedKind);
}

export function keepVisible<T extends { creatorId: string; creatorUserId: string }>(
  items: readonly T[],
  blockedUserIds: ReadonlySet<string>,
  hiddenCreatorIds: ReadonlySet<string>,
): T[] {
  return items.filter((item) => !blockedUserIds.has(item.creatorUserId) && !hiddenCreatorIds.has(item.creatorId));
}

export function scoreCandidate(item: RankCandidate, viewer: RankViewer): { score: number; reasons: ReasonCode[] } {
  let score = 0;
  const reasons: ReasonCode[] = [];
  const ageHours = Math.max(0, (viewer.nowMs - item.createdAtMs) / 3_600_000);
  const recency = Math.max(0, 400 - Math.floor(ageHours / 6));
  score += recency;
  if (recency >= 200) reasons.push("recent");

  if (viewer.languages.includes(item.contentLanguage)) {
    score += 120;
    reasons.push("language");
  }
  if (viewer.regionCode && viewer.regionCode === item.countryCode) {
    score += 80;
    reasons.push("region");
  }
  if (viewer.interested.includes(item.deedKind) || viewer.interested.includes(item.craftKey)) {
    score += 150;
    reasons.push("interest");
  }
  if (viewer.notInterested.includes(item.deedKind) || viewer.notInterested.includes(item.craftKey)) {
    score -= 400;
  }
  const kindness = Math.min(item.blessingCount, 20) * 8 + Math.min(item.commentCount, 10) * 4;
  score += kindness;
  if (item.blessingCount + item.commentCount > 0) reasons.push("kindness");
  if (item.reportCount > 0) {
    score -= 250 * Math.min(item.reportCount, 3);
    reasons.push("quietReports");
  }
  return { score, reasons };
}

function compareScore(a: Scored, b: Scored): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.item.createdAtMs !== a.item.createdAtMs) return b.item.createdAtMs - a.item.createdAtMs;
  if (a.item.id < b.item.id) return -1;
  if (a.item.id > b.item.id) return 1;
  return 0;
}

function dedupe(items: readonly RankCandidate[]): RankCandidate[] {
  const seen = new Set<string>();
  const out: RankCandidate[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function creatorExposure(items: readonly RankCandidate[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.creatorId, (totals.get(item.creatorId) ?? 0) + item.blessingCount + item.commentCount);
  }
  return totals;
}

function scoreAll(items: readonly RankCandidate[], viewer: RankViewer): Scored[] {
  const exposure = creatorExposure(items);
  return items.map((item) => {
    const scored = scoreCandidate(item, viewer);
    const fresh = (exposure.get(item.creatorId) ?? 0) < LOW_EXPOSURE;
    const reasons = fresh ? [...scored.reasons, "newCreator" as const] : scored.reasons;
    return { id: item.id, creatorId: item.creatorId, score: scored.score, reasons, item, fresh };
  });
}

function fits(placed: readonly Scored[], creatorId: string): boolean {
  const window = placed.slice(-FAIRNESS_WINDOW);
  return window.filter((row) => row.creatorId === creatorId).length < MAX_PER_CREATOR_WINDOW;
}

function pull(pool: readonly Scored[], start: number, placed: readonly Scored[], used: ReadonlySet<string>, onlyFitting: boolean) {
  for (let index = start; index < pool.length; index += 1) {
    const row = pool[index]!;
    if (used.has(row.id)) continue;
    if (onlyFitting && !fits(placed, row.creatorId)) continue;
    return { row, next: index + 1 };
  }
  return null;
}

/** For You: score, then a 1-in-4 slot for creators with little kindness, then a fairness window. */
export function rankForYou(items: readonly RankCandidate[], viewer: RankViewer): Ranked[] {
  const scored = scoreAll(dedupe(items), viewer).sort(compareScore);
  const regular = scored.filter((row) => !row.fresh);
  const fresh = scored.filter((row) => row.fresh);
  const placed: Scored[] = [];
  const used = new Set<string>();
  let regularAt = 0;
  let freshAt = 0;

  while (placed.length < scored.length) {
    const exploration = (placed.length + 1) % EXPLORATION_EVERY === 0;
    let picked = exploration ? pull(fresh, freshAt, placed, used, true) : pull(regular, regularAt, placed, used, true);
    let fromFresh = exploration && picked != null;
    if (!picked) {
      picked = exploration ? pull(regular, regularAt, placed, used, true) : pull(fresh, freshAt, placed, used, true);
      fromFresh = !exploration && picked != null;
    }
    if (!picked) {
      picked = pull(scored, 0, placed, used, false);
      fromFresh = Boolean(picked?.row.fresh);
    }
    if (!picked) break;
    placed.push(picked.row);
    used.add(picked.row.id);
    if (fromFresh) freshAt = Math.max(freshAt, fresh.findIndex((row) => row.id === picked.row.id) + 1);
    else regularAt = Math.max(regularAt, regular.findIndex((row) => row.id === picked.row.id) + 1);
  }

  return placed.map(({ id, creatorId, score, reasons }) => ({ id, creatorId, score, reasons }));
}

export function rankFollowing(items: readonly RankCandidate[]): Ranked[] {
  return dedupe(items)
    .slice()
    .sort((a, b) => b.createdAtMs - a.createdAtMs || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((item) => ({ id: item.id, creatorId: item.creatorId, score: item.createdAtMs, reasons: ["followed"] }));
}

function communitySort(items: RankCandidate[], viewer: RankViewer): RankCandidate[] {
  return items.slice().sort((a, b) => {
    const aLang = viewer.languages.includes(a.contentLanguage) ? 1 : 0;
    const bLang = viewer.languages.includes(b.contentLanguage) ? 1 : 0;
    if (bLang !== aLang) return bLang - aLang;
    if (b.createdAtMs !== a.createdAtMs) return b.createdAtMs - a.createdAtMs;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}

export function rankCommunity(items: readonly RankCandidate[], viewer: RankViewer): Ranked[] {
  const community = dedupe(items).filter((item) => isCommunity(item));
  const ordered = viewer.regionCode
    ? interleave(
        communitySort(community.filter((item) => item.countryCode === viewer.regionCode), viewer),
        communitySort(community.filter((item) => item.countryCode !== viewer.regionCode), viewer),
      )
    : communitySort(community, viewer);
  return ordered.map((item) => {
    const reasons: ReasonCode[] = ["community"];
    if (viewer.regionCode && item.countryCode === viewer.regionCode) reasons.push("region");
    if (viewer.languages.includes(item.contentLanguage)) reasons.push("language");
    return { id: item.id, creatorId: item.creatorId, score: item.createdAtMs, reasons };
  });
}

function interleave<T>(local: readonly T[], global: readonly T[]): T[] {
  const out: T[] = [];
  const max = Math.max(local.length, global.length);
  for (let index = 0; index < max; index += 1) {
    if (index < local.length) out.push(local[index]!);
    if (index < global.length) out.push(global[index]!);
  }
  return out;
}

export function pageByCursor<T extends { id: string }>(
  items: readonly T[],
  cursor: string | null,
  pageSize = PAGE_SIZE,
): { page: T[]; nextCursor: string | null } {
  let start = 0;
  if (cursor) {
    const index = items.findIndex((item) => item.id === cursor);
    if (index < 0) return { page: [], nextCursor: null };
    start = index + 1;
  }
  const page = items.slice(start, start + pageSize);
  const last = page[page.length - 1];
  const nextCursor = last && start + pageSize < items.length ? last.id : null;
  return { page, nextCursor };
}
