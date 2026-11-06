import type { Locale } from "../config/app";
import { pickLocalized } from "../lib/format";
import type { FeedVideo } from "../lib/types";
import { messagesFor } from "../i18n";
import { db } from "./db";

export async function loadFeed(locale: Locale, userId: string | null): Promise<FeedVideo[]> {
  const messages = messagesFor(locale);
  const videos = await db.video.findMany({
    where: { moderationStatus: "VISIBLE" },
    orderBy: { createdAt: "desc" },
    take: 30,
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
  const chains = ids.length
    ? await db.ledgerTransaction.groupBy({
        by: ["videoId"],
        where: { videoId: { in: ids }, payItForwardFromId: { not: null }, status: { in: ["HELD", "AVAILABLE", "PAID_OUT"] } },
        _count: { _all: true },
      })
    : [];
  const chainByVideo = new Map(chains.map((row) => [row.videoId, row._count._all]));

  return videos.map((video) => {
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
      chainCount: chainByVideo.get(video.id) ?? 0,
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
  });
}
