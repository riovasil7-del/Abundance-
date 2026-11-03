import Link from "next/link";
import { LiveRoomClient } from "@/components/live-room-client";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { pickLocalized } from "@/lib/format";
import { getCurrentUser } from "@/server/auth";
import { loadGiftChoices } from "@/server/catalog";
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

  const gifts = await loadGiftChoices(locale);
  const title = session.circle ? pickLocalized(locale, session.circle.title, session.circle.titleEn) : session.title;

  return (
    <LiveRoomClient
      sessionId={session.id}
      title={title}
      circle={Boolean(session.circleId)}
      hostName={session.host.displayName}
      configured={Boolean(readLiveKitCredentials())}
      loggedIn={Boolean(user)}
      isHost={user?.creatorProfile?.id === session.hostId}
      gifts={gifts}
    />
  );
}
