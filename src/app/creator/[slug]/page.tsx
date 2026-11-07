import Link from "next/link";
import { StoryDesk } from "@/components/story-desk";
import { CreatorBond } from "@/components/creator-bond";
import { FamilyJoin } from "@/components/creator-actions";
import { StartLiveButton } from "@/components/start-live-button";
import { readLiveKitCredentials } from "@/server/live-access";
import { FAMILY_TIERS_CENTS } from "@/config/app";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { pickLocalized } from "@/lib/format";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { splitDonation } from "@/server/fees";

export default async function CreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const user = await getCurrentUser();
  const creator = await db.creatorProfile.findUnique({
    where: { slug },
    include: { videos: { orderBy: { createdAt: "desc" } } },
  });
  if (!creator) {
    return (
      <div className="page">
        <p>{messages.common.error}</p>
      </div>
    );
  }

  const country = messages.countries[creator.countryCode as keyof typeof messages.countries] ?? creator.countryCode;
  const craft = messages.crafts[creator.craftKey as keyof typeof messages.crafts] ?? creator.craftKey;
  const verification = messages.verify[creator.verificationStatus];
  const membership = user
    ? await db.familyMembership.findUnique({
        where: { supporterId_creatorId: { supporterId: user.id, creatorId: creator.id } },
      })
    : null;
  const tiers = FAMILY_TIERS_CENTS.map((cents) => ({ cents, netCents: splitDonation(cents).netCents }));
  const self = user?.creatorProfile?.id === creator.id;
  const following = user
    ? Boolean(await db.follow.findUnique({ where: { followerId_creatorId: { followerId: user.id, creatorId: creator.userId } } }))
    : false;
  const updates = await db.creatorUpdate.findMany({
    where: { creatorId: creator.userId, moderationStatus: "VISIBLE" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="page stack">
      <div className="person">
        <img className="avatar-lg" src={creator.avatarUrl} alt="" />
        <div>
          <h1>{creator.displayName}</h1>
          <p className="muted">
            {creator.city}, {country}
          </p>
          <span className={creator.verificationStatus === "VERIFIED" ? "pill" : "pill wait"}>{verification}</span>
        </div>
      </div>
      <p>{pickLocalized(locale, creator.bio, creator.bioEn)}</p>
      <p className="muted">{craft}</p>
      {self ? (
        <Link className="btn-primary" href="/wallet">
          {messages.creator.wallet}
        </Link>
      ) : null}

      <section className="stack">
        <h2>{messages.creator.videos}</h2>
        <div className="video-grid">
          {creator.videos
            .filter((video) => video.visibility === "PUBLISHED" && video.moderationStatus === "VISIBLE")
            .map((video) => (
            <Link key={video.id} href="/" className="thumb">
              {video.posterUrl ? <img src={video.posterUrl} alt="" /> : <div className="ph" />}
              <span>
                <strong>{pickLocalized(locale, video.title, video.titleEn)}</strong>
                <br />
                <span className="muted">{pickLocalized(locale, video.caption, video.captionEn)}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      {self ? (
        <StoryDesk
          stories={creator.videos.map((video) => ({
            id: video.id,
            title: video.title,
            visibility: video.visibility,
            mediaKind: video.mediaKind,
          }))}
        />
      ) : null}

      <CreatorBond
        creatorUserId={creator.userId}
        self={self}
        loggedIn={Boolean(user)}
        initialFollowing={following}
        updates={updates.map((update) => ({ id: update.id, body: update.body }))}
      />
      {self ? <StartLiveButton configured={Boolean(readLiveKitCredentials())} /> : null}
      {user && !self ? <FamilyJoin creatorId={creator.id} tiers={tiers} already={membership?.status === "ACTIVE"} /> : null}
      {!user ? (
        <Link className="btn-primary" href="/login">
          {messages.auth.login}
        </Link>
      ) : null}
    </div>
  );
}
