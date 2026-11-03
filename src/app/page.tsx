import Link from "next/link";
import { FeedExperience } from "@/components/feed-experience";
import { loadGiftChoices } from "@/server/catalog";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { loadFeed } from "@/server/feed";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";

export default async function HomePage() {
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const user = await getCurrentUser();
  const [videos, gifts, liveNow] = await Promise.all([
    loadFeed(locale, user?.id ?? null),
    loadGiftChoices(locale),
    db.liveSession.findMany({ where: { status: "LIVE" }, include: { host: true }, orderBy: { startedAt: "desc" }, take: 3 }),
  ]);

  return (
    <div className="feed-page">
      {liveNow.length > 0 ? (
        <div className="page" style={{ paddingBottom: 0 }}>
          {liveNow.map((session) => (
            <Link key={session.id} href={`/live/${session.id}`} className="card live-banner">
              <span>
                <strong>{messages.live.title}</strong>
                <span className="muted"> · {session.host.displayName}</span>
              </span>
              <span>{messages.live.watch}</span>
            </Link>
          ))}
        </div>
      ) : null}
      <FeedExperience videos={videos} gifts={gifts} loggedIn={Boolean(user)} viewerName={user?.name ?? null} />
    </div>
  );
}
