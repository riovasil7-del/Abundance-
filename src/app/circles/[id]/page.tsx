import Link from "next/link";
import { CircleDonate } from "@/components/circle-donate";
import { JoinCircleButton } from "@/components/admin-panel";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { pickLocalized } from "@/lib/format";
import { getCurrentUser } from "@/server/auth";
import { loadGiftChoices, orderedVerified } from "@/server/catalog";
import { db } from "@/server/db";
import { sharesFromNet } from "@/server/ledger";

export default async function CirclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const user = await getCurrentUser();
  const circle = await db.blessingCircle.findUnique({
    where: { id },
    include: {
      host: true,
      participants: { include: { creator: true }, orderBy: { joinedAt: "asc" } },
      videos: { where: { moderationStatus: "VISIBLE" }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!circle) {
    return (
      <div className="page">
        <p>{messages.common.error}</p>
      </div>
    );
  }

  const recipients = orderedVerified(circle.participants);
  const gifts = (await loadGiftChoices(locale)).map((gift) => {
    const shares = recipients.length ? sharesFromNet(recipients.map((recipient) => recipient.creatorId), gift.netCents) : [];
    return {
      ...gift,
      shares: shares.map((share) => ({
        name: recipients.find((recipient) => recipient.creatorId === share.creatorId)?.displayName ?? "",
        netCents: share.netCents,
      })),
    };
  });
  const joined = Boolean(user?.creatorProfile && circle.participants.some((participant) => participant.creatorId === user.creatorProfile?.id));

  return (
    <div className="page stack" data-screen="circle">
      <div>
        <p className="kicker">{messages.circles.kicker}</p>
        <h1>{pickLocalized(locale, circle.title, circle.titleEn)}</h1>
        <p className="lede">{pickLocalized(locale, circle.description, circle.descriptionEn)}</p>
        <p>
          <span className="pill">{messages.circles.everyone}</span>
        </p>
      </div>

      <section className="stack">
        <h2>{messages.circles.participants}</h2>
        {circle.participants.map((participant) => {
          const verified = participant.creator.verificationStatus === "VERIFIED";
          return (
            <div className="card person" key={participant.id}>
              <img src={participant.creator.avatarUrl} alt="" />
              <div>
                <Link href={`/creator/${participant.creator.slug}`}>
                  <strong>{participant.creator.displayName}</strong>
                </Link>
                <div className="muted">{participant.creator.city}</div>
                <span className={verified ? "pill" : "pill wait"}>{verified ? messages.circles.verified : messages.circles.waiting}</span>
                {participant.creatorId === circle.hostId ? <span className="pill soft"> {messages.circles.host}</span> : null}
              </div>
            </div>
          );
        })}
        {user?.creatorProfile && !joined ? <JoinCircleButton circleId={circle.id} /> : null}
        {joined ? <p className="muted">{messages.circles.joined}</p> : null}
      </section>

      <section className="stack">
        <h2>{messages.circles.videos}</h2>
        {circle.videos.map((video) => (
          <Link key={video.id} href={`/?video=${video.id}`} className="card" style={{ textDecoration: "none" }}>
            <strong>{pickLocalized(locale, video.title, video.titleEn)}</strong>
            <p className="muted">{pickLocalized(locale, video.caption, video.captionEn)}</p>
          </Link>
        ))}
      </section>

      {user ? (
        <CircleDonate circleId={circle.id} gifts={gifts} enabled={recipients.length > 0 && !recipients.some((recipient) => recipient.creatorId === user.creatorProfile?.id)} />
      ) : (
        <Link className="btn-primary" href="/login">
          {messages.auth.login}
        </Link>
      )}
    </div>
  );
}
