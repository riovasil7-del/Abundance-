import Link from "next/link";
import { FamilyJoin, LiveButton } from "@/components/creator-actions";
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
    include: { videos: { where: { moderationStatus: "VISIBLE" }, orderBy: { createdAt: "desc" } } },
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
          {creator.videos.map((video) => (
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

      {self ? <LiveButton /> : null}
      {user && !self ? <FamilyJoin creatorId={creator.id} tiers={tiers} already={membership?.status === "ACTIVE"} /> : null}
      {!user ? (
        <Link className="btn-primary" href="/login">
          {messages.auth.login}
        </Link>
      ) : null}
    </div>
  );
}
