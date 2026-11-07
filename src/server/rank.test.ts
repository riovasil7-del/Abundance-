import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPLORATION_EVERY,
  keepVisible,
  pageByCursor,
  rankCommunity,
  rankFollowing,
  rankForYou,
  scoreCandidate,
  type RankCandidate,
  type RankViewer,
} from "./rank";

const now = 1_700_000_000_000;

function item(partial: Partial<RankCandidate> & Pick<RankCandidate, "id" | "creatorId">): RankCandidate {
  return {
    creatorUserId: partial.creatorId,
    createdAtMs: now,
    deedKind: "good_deed",
    craftKey: "garden",
    countryCode: "KE",
    contentLanguage: "en",
    blessingCount: 2,
    commentCount: 0,
    reportCount: 0,
    giftCents: 0,
    circle: false,
    ...partial,
  };
}

const viewer: RankViewer = {
  languages: ["en"],
  regionCode: null,
  interested: [],
  notInterested: [],
  nowMs: now,
};

test("for you order is deterministic and does not read gift spend", () => {
  const items = [
    item({ id: "a", creatorId: "a", blessingCount: 1, giftCents: 0 }),
    item({ id: "b", creatorId: "b", blessingCount: 4, giftCents: 50_000, createdAtMs: now - 3_600_000 }),
    item({ id: "c", creatorId: "c", blessingCount: 0, giftCents: 9_999_999 }),
  ];
  const first = rankForYou(items, viewer);
  const second = rankForYou(items, viewer);
  assert.deepEqual(first, second);
  const quiet = scoreCandidate(item({ id: "a", creatorId: "a", blessingCount: 0, giftCents: 0 }), viewer);
  const paid = scoreCandidate(item({ id: "a", creatorId: "a", blessingCount: 0, giftCents: 80_000 }), viewer);
  assert.equal(paid.score, quiet.score);
  assert.deepEqual(paid.reasons, quiet.reasons);
  const kind = scoreCandidate(item({ id: "k", creatorId: "k", blessingCount: 5, giftCents: 0 }), viewer);
  assert.ok(kind.score > paid.score);
  assert.equal(kind.reasons.includes("kindness"), true);
});

test("a not-interested topic drops below an interest, and reports demote", () => {
  const weaving = item({ id: "w", creatorId: "w", craftKey: "weaving", deedKind: "craft" });
  const liked = scoreCandidate(weaving, { ...viewer, interested: ["weaving"] });
  const avoided = scoreCandidate(weaving, { ...viewer, notInterested: ["weaving"] });
  assert.ok(liked.score - avoided.score >= 400);
  assert.equal(liked.reasons.includes("interest"), true);
  const reported = scoreCandidate({ ...weaving, reportCount: 2 }, viewer);
  const clean = scoreCandidate(weaving, viewer);
  assert.ok(clean.score > reported.score);
  assert.equal(reported.reasons.includes("quietReports"), true);
});

test("exploration stays inside one slot per four items, and one creator cannot fill the window", () => {
  const regular = ["a", "b", "c", "d", "e", "f"].map((creator, index) =>
    item({ id: `r${index}`, creatorId: creator, blessingCount: 3, createdAtMs: now - index }),
  );
  const fresh = ["n1", "n2"].map((creator, index) =>
    item({ id: `f${index}`, creatorId: creator, blessingCount: 0, commentCount: 0, createdAtMs: now - 10 - index }),
  );
  const ranked = rankForYou([...regular, ...fresh], viewer);
  const firstPage = ranked.slice(0, 8);
  const freshIds = new Set(fresh.map((row) => row.id));
  const freshInPage = firstPage.filter((row) => freshIds.has(row.id));
  assert.equal(freshInPage.length, 2);
  assert.equal(firstPage[EXPLORATION_EVERY - 1]?.id.startsWith("f"), true);
  assert.equal(firstPage[EXPLORATION_EVERY * 2 - 1]?.id.startsWith("f"), true);

  const crowded = [
    ...[1, 2, 3, 4].map((n) => item({ id: `A${n}`, creatorId: "alpha", blessingCount: 10, createdAtMs: now - n })),
    ...[1, 2, 3, 4].map((n) => item({ id: `B${n}`, creatorId: "beta", blessingCount: 9, createdAtMs: now - 10 - n })),
  ];
  const fair = rankForYou(crowded, viewer).slice(0, FAIR_WINDOW());
  const alphas = fair.filter((row) => row.creatorId === "alpha").length;
  const betas = fair.filter((row) => row.creatorId === "beta").length;
  assert.equal(alphas, 2);
  assert.equal(betas, 2);
});

function FAIR_WINDOW() {
  return 4;
}

test("blocked and hidden creators are left out, and pages do not repeat", () => {
  const items = [item({ id: "1", creatorId: "c1", creatorUserId: "u1" }), item({ id: "2", creatorId: "c2", creatorUserId: "u2" })];
  const kept = keepVisible(items, new Set(["u1"]), new Set(["c2"]));
  assert.deepEqual(kept, []);
  const ranked = rankFollowing([
    item({ id: "old", creatorId: "c", createdAtMs: now - 50_000, giftCents: 10_000 }),
    item({ id: "new", creatorId: "c", createdAtMs: now, giftCents: 0 }),
    item({ id: "new", creatorId: "c", createdAtMs: now, giftCents: 1 }),
  ]);
  assert.deepEqual(ranked.map((row) => row.id), ["new", "old"]);
  const page1 = pageByCursor(ranked, null, 1);
  const page2 = pageByCursor(ranked, page1.nextCursor, 1);
  assert.deepEqual(page1.page.map((row) => row.id), ["new"]);
  assert.deepEqual(page2.page.map((row) => row.id), ["old"]);
  assert.equal(page1.page.some((row) => page2.page.some((next) => next.id === row.id)), false);
  assert.equal(pageByCursor(ranked, "missing", 2).page.length, 0);
});

test("community mixes the chosen region with everywhere else, and language is a reason", () => {
  const items = [
    item({ id: "ke1", creatorId: "k", countryCode: "KE", contentLanguage: "sw", createdAtMs: now }),
    item({ id: "sk1", creatorId: "s", countryCode: "SK", contentLanguage: "sk", createdAtMs: now - 1 }),
    item({ id: "ke2", creatorId: "k2", countryCode: "KE", contentLanguage: "en", createdAtMs: now - 2 }),
    item({ id: "song", creatorId: "g", deedKind: "song", circle: false, createdAtMs: now }),
  ];
  const mixed = rankCommunity(items, { ...viewer, regionCode: "KE", languages: ["sw"] });
  assert.deepEqual(mixed.map((row) => row.id), ["ke1", "sk1", "ke2"]);
  assert.equal(mixed[0]?.reasons.includes("region"), true);
  assert.equal(mixed[0]?.reasons.includes("language"), true);
  assert.equal(mixed[1]?.reasons.includes("region"), false);
  const swapped = rankForYou(
    [
      item({ id: "sk", creatorId: "s", contentLanguage: "sk", blessingCount: 2 }),
      item({ id: "en", creatorId: "e", contentLanguage: "en", blessingCount: 2 }),
    ],
    { ...viewer, languages: ["sk"] },
  );
  assert.equal(swapped[0]?.id, "sk");
  assert.equal(rankForYou(swapped.map((row) => item({ id: row.id, creatorId: row.creatorId, contentLanguage: row.id === "sk" ? "sk" : "en", blessingCount: 2 })), { ...viewer, languages: ["en"] })[0]?.id, "en");
});
