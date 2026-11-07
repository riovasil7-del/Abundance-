import type { Locale } from "../config/app";
import { pickLocalized } from "../lib/format";
import type { FeedVideo } from "../lib/types";
import { messagesFor } from "../i18n";
import { db } from "./db";
import {
  keepVisible,
  pageByCursor,
  rankCommunity,
  rankFollowing,
  rankForYou,
  type RankViewer,
  type ReasonCode,
} from "./rank";

export type FeedView = "forYou" | "following" | "community";

const CANDIDATE_CAP = 80;

export function parseFeedView(value: string | null): FeedView {
  if (value === "following" || value === "community" || value === "forYou") return value;
  return "forYou";
}

export async function loadFeedPage(input: {
  locale: Locale;
  userId: string | null;
  view: FeedView;
  cursor: string | null;
}): Promise<{ items: FeedVideo[]; nextCursor: string | null; needsLogin: boolean }> {
  if (input.view === "following" && !input.userId) {
    return { items: [], nextCursor: null, needsLogin: true };
  }

  const userId = input.userId;
  const [taste, topics, hides, blocks, follows] = userId
    ? await Promise.all([
        db.feedTaste.findUnique({ where: { userId } }),
        db.topicPreference.findMany({ where: { userId } }),
        db.feedHide.findMany({ where: { userId }, select: { creatorId: true } }),
        db.userBlock.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } }),
        input.view === "following" ? db.follow.findMany({ where: { followerId: userId }, select: { creatorId: true } }) : Promise.resolve([]),
      ])
    : [null, [], [], [], []];

  const followedUserIds = follows.map((row) => row.creatorId);
  if (input.view === "following" && followedUserIds.length === 0) {
    return { items: [], nextCursor: null, needsLogin: false };
  }

  const videos = await db.video.findMany({
    where: {
      moderationStatus: "VISIBLE",
      visibility: "PUBLISHED",
      ...(input.view === "following" ? { creator: { userId: { in: followedUserIds } } } : {}),
      ...(input.view === "community"
        ? { OR: [{ deedKind: { in: ["good_deed", "craft", "gratitude"] } }, { circleId: { not: null } }] }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: CANDIDATE_CAP,
    include: {
      creator: true,
      _count: { select: { blessings: true, comments: { where: { moderationStatus: "VISIBLE" } } } },
      blessings: userId ? { where: { userId }, select: { id: true } } : false,
      transactions: {
        where: { status: { in: ["HELD", "AVAILABLE", "PAID_OUT"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { gift: true, donor: { select: { name: true } } },
      },
    },
  });

  const ids = videos.map((video) => video.id);
  const [reports, gifts, chains] = ids.length
    ? await Promise.all([
        db.report.groupBy({
          by: ["targetId"],
          where: { targetType: "VIDEO", targetId: { in: ids }, status: "OPEN" },
          _count: { _all: true },
        }),
        db.ledgerTransaction.groupBy({
          by: ["videoId"],
          where: { videoId: { in: ids }, status: { in: ["HELD", "AVAILABLE", "PAID_OUT"] } },
          _sum: { grossCents: true },
        }),
        db.ledgerTransaction.groupBy({
          by: ["videoId"],
          where: { videoId: { in: ids }, payItForwardFromId: { not: null }, status: { in: ["HELD", "AVAILABLE", "PAID_OUT"] } },
          _count: { _all: true },
        }),
      ])
    : [[], [], []];
  const reportCount = new Map(reports.map((row) => [row.targetId, row._count._all]));
  const giftCents = new Map(gifts.flatMap((row) => (row.videoId ? [[row.videoId, row._sum.grossCents ?? 0] as const] : [])));
  const chainByVideo = new Map(chains.flatMap((row) => (row.videoId ? [[row.videoId, row._count._all] as const] : [])));

  const blockedUsers = new Set(blocks.map((row) => (row.blockerId === userId ? row.blockedId : row.blockerId)));
  const hiddenCreators = new Set(hides.map((row) => row.creatorId));
  const candidates = keepVisible(
    videos.map((video) => ({
      id: video.id,
      creatorId: video.creator.id,
      creatorUserId: video.creator.userId,
      createdAtMs: video.createdAt.getTime(),
      deedKind: video.deedKind,
      craftKey: video.creator.craftKey,
      countryCode: video.creator.countryCode,
      contentLanguage: video.language,
      blessingCount: video._count.blessings,
      commentCount: video._count.comments,
      reportCount: reportCount.get(video.id) ?? 0,
      giftCents: giftCents.get(video.id) ?? 0,
      circle: Boolean(video.circleId),
    })),
    blockedUsers,
    hiddenCreators,
  );

  const viewer: RankViewer = {
    languages: taste?.languages?.length ? taste.languages : [input.locale],
    regionCode: taste?.regionCode ?? null,
    interested: topics.filter((row) => row.interested).map((row) => row.topic),
    notInterested: topics.filter((row) => !row.interested).map((row) => row.topic),
    nowMs: Date.now(),
  };
  const ranked =
    input.view === "following" ? rankFollowing(candidates) : input.view === "community" ? rankCommunity(candidates, viewer) : rankForYou(candidates, viewer);
  const paged = pageByCursor(ranked, input.cursor);
  const byId = new Map(videos.map((video) => [video.id, video]));
  const reasons = new Map(paged.page.map((row) => [row.id, row.reasons]));
  return {
    items: paged.page.flatMap((row) => {
      const video = byId.get(row.id);
      return video ? [toFeedVideo(video, input.locale, reasons.get(row.id) ?? [], chainByVideo.get(row.id) ?? 0)] : [];
    }),
    nextCursor: paged.nextCursor,
    needsLogin: false,
  };
}

function toFeedVideo(
  video: {
    id: string;
    title: string;
    titleEn: string | null;
    caption: string;
    captionEn: string | null;
    playbackUrl: string | null;
    posterUrl: string | null;
    deedKind: string;
    _count: { blessings: number; comments: number };
    blessings: { id: string }[] | false;
    creator: {
      id: string;
      slug: string;
      displayName: string;
      city: string;
      countryCode: string;
      avatarUrl: string;
      verificationStatus: string;
    };
    transactions: {
      id: string;
      anonymous: boolean;
      gift: { slug: string; nameEn: string } | null;
      donor: { name: string };
    }[];
  },
  locale: Locale,
  reasons: ReasonCode[],
  chainCount: number,
): FeedVideo {
  const messages = messagesFor(locale);
  const country = messages.countries[video.creator.countryCode as keyof typeof messages.countries] ?? video.creator.countryCode;
  const verification =
    video.creator.verificationStatus === "VERIFIED"
      ? messages.verify.VERIFIED
      : video.creator.verificationStatus === "PENDING"
        ? messages.verify.PENDING
        : video.creator.verificationStatus === "REJECTED"
          ? messages.verify.REJECTED
          : messages.verify.UNVERIFIED;
  return {
    id: video.id,
    title: pickLocalized(locale, video.title, video.titleEn),
    caption: pickLocalized(locale, video.caption, video.captionEn),
    playbackUrl: video.playbackUrl,
    posterUrl: video.posterUrl,
    deedLabel: messages.deeds[video.deedKind as keyof typeof messages.deeds] ?? video.deedKind,
    blessingCount: video._count.blessings,
    blessedByMe: Array.isArray(video.blessings) && video.blessings.length > 0,
    commentCount: video._count.comments,
    chainCount,
    reasons,
    creator: {
      id: video.creator.id,
      slug: video.creator.slug,
      displayName: video.creator.displayName,
      place: `${video.creator.city}, ${country}`,
      avatarUrl: video.creator.avatarUrl,
      verification,
    },
    recentGifts: video.transactions.map((transaction) => ({
      id: transaction.id,
      label: transaction.gift
        ? (messages.giftNames[transaction.gift.slug as keyof typeof messages.giftNames] ?? transaction.gift.nameEn)
        : messages.wallet.family,
      anonymous: transaction.anonymous,
      donorName: transaction.anonymous ? null : transaction.donor.name,
    })),
  };
}
