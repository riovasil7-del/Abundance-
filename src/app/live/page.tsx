import Link from "next/link";
import { StartLiveButton } from "@/components/start-live-button";
import { TermsGate } from "@/components/terms-gate";
import { CONTENT_CATEGORIES, isContentCategory } from "@/config/app";
import { termsAreCurrent } from "@/server/terms";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { readLiveKitCredentials } from "@/server/live-access";

export default async function LiveIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; category?: string; idea?: string }>;
}) {
  const query = await searchParams;
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const user = await getCurrentUser();
  const configured = Boolean(readLiveKitCredentials());
  const category = isContentCategory(query.category) ? query.category : null;
  const sessions = await db.liveSession.findMany({
    where: { status: "LIVE", ...(category ? { contentCategory: category } : {}) },
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
      <div className="chip-row" role="group" aria-label={messages.feed.allCategories}>
        <Link className={category ? "chip" : "chip on"} href="/live">{messages.feed.allCategories}</Link>
        {CONTENT_CATEGORIES.map((item) => (
          <Link key={item} className={category === item ? "chip on" : "chip"} href={`/live?category=${item}`}>
            {messages.contentCategories[item]}
          </Link>
        ))}
      </div>
      {user?.creatorProfile ? (
        <>
          <TermsGate needed={!termsAreCurrent(user)} />
          <StartLiveButton
            configured={configured}
            initialTitle={query.title ?? ""}
            initialCategory={category ?? ""}
            ideaSlug={query.idea ?? ""}
          />
        </>
      ) : (
        <p className="notice">{messages.live.supporters}</p>
      )}
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
            {isContentCategory(session.contentCategory) ? <span className="pill">{messages.contentCategories[session.contentCategory]}</span> : null}
            <h2>{session.host.displayName}</h2>
            <p className="muted">{session.circleId ? messages.live.circle : session.title}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
