import Link from "next/link";
import { StartLiveButton } from "@/components/start-live-button";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { readLiveKitCredentials } from "@/server/live-access";

export default async function LiveIndexPage() {
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const user = await getCurrentUser();
  const configured = Boolean(readLiveKitCredentials());
  const sessions = await db.liveSession.findMany({
    where: { status: "LIVE" },
    include: { host: true, circle: true },
    orderBy: { startedAt: "desc" },
  });

  return (
    <div className="page stack" data-screen="live-index">
      <div>
        <p className="kicker">{messages.live.title}</p>
        <h1>{messages.live.listTitle}</h1>
        <p className="lede">{messages.live.together}</p>
      </div>
      {!configured ? <div className="notice">{messages.live.notConfigured}</div> : null}
      {user?.creatorProfile ? <StartLiveButton configured={configured} /> : null}
      {sessions.length === 0 ? <p className="empty">{messages.live.empty}</p> : null}
      {sessions.map((session) => (
        <Link key={session.id} href={`/live/${session.id}`} className="card stack" style={{ textDecoration: "none" }}>
          <span className="pill">{session.circleId ? messages.live.circle : messages.live.title}</span>
          <h2>{session.title}</h2>
          <p className="muted">{session.host.displayName}</p>
        </Link>
      ))}
    </div>
  );
}
