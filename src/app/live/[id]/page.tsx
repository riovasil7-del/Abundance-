import Link from "next/link";
import { LiveRoomClient } from "@/components/live-room-client";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { pickLocalized } from "@/lib/format";
import { getCurrentUser, hasRole } from "@/server/auth";
import { translateConfigured } from "@/lib/live-chat";
import { loadGiftChoices } from "@/server/catalog";
import { lightBalance } from "@/server/credits";
import { db } from "@/server/db";
import { readLiveKitCredentials } from "@/server/live-access";

export default async function LiveRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const user = await getCurrentUser();
  const session = await db.liveSession.findUnique({
    where: { id },
    include: { host: true, circle: true },
  });
  if (!session) {
    return (
      <div className="page">
        <h1>{messages.live.title}</h1>
        <p>{messages.live.ended}</p>
        <Link href="/live">{messages.common.back}</Link>
      </div>
    );
  }

  const cohost = user
    ? await db.liveInvite.findFirst({ where: { sessionId: session.id, inviteeId: user.id, status: "ACCEPTED" }, select: { id: true } })
    : null;
  const gifts = await loadGiftChoices(locale);
  const title = session.circle ? pickLocalized(locale, session.circle.title, session.circle.titleEn) : session.title;
  const blessing = await db.ledgerTransaction.aggregate({
    where: { liveSessionId: session.id, status: { in: ["HELD", "AVAILABLE", "PAID_OUT"] } },
    _sum: { netCents: true },
  });

  return (
    <LiveRoomClient
      sessionId={session.id}
      title={title}
      hostName={session.host.displayName}
      hostAvatar={session.host.avatarUrl}
      configured={Boolean(readLiveKitCredentials())}
      loggedIn={Boolean(user)}
      isHost={user?.creatorProfile?.id === session.hostId}
      canModerate={Boolean(user) && (user?.creatorProfile?.id === session.hostId || Boolean(cohost) || hasRole(user, ["MODERATOR", "ADMIN"]))}
      translateEnabled={translateConfigured({ key: process.env.TRANSLATE_API_KEY, url: process.env.TRANSLATE_API_URL })}
      gifts={gifts}
      blessingNetCents={blessing._sum.netCents ?? 0}
      lightBalance={user ? await lightBalance(user.id) : 0}
    />
  );
}
