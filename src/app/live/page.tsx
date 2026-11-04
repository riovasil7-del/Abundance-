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
      {user?.creatorProfile ? <StartLiveButton configured={configured} /> : <p className="notice">{messages.live.supporters}</p>}
      {!user ? (
        <Link className="btn-primary" href="/login">
          {messages.auth.login}
        </Link>
      ) : null}
      {sessions.length === 0 ? <p className="empty">{messages.live.empty}</p> : null}
      {sessions.map((session) => (
        <Link key={session.id} href={`/live/${session.id}`} className="card person" style={{ textDecoration: "none" }}>
          <img src={session.host.avatarUrl} alt="" />
          <div>
            <span className="pill">{messages.live.title}</span>
            <h2>{session.host.displayName}</h2>
            <p className="muted">{session.circleId ? messages.live.circle : session.title}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
