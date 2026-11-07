import Link from "next/link";
import { FeedExperience } from "@/components/feed-experience";
import { loadGiftChoices } from "@/server/catalog";
import { lightBalance } from "@/server/credits";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { loadFeedPage } from "@/server/feed";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";

export default async function HomePage() {
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const user = await getCurrentUser();
  const [pageFeed, gifts, liveNow, lights] = await Promise.all([
    loadFeedPage({ locale, userId: user?.id ?? null, view: "forYou", cursor: null }),
    loadGiftChoices(locale),
    db.liveSession.findMany({ where: { status: "LIVE" }, include: { host: true }, orderBy: { startedAt: "desc" }, take: 3 }),
    user ? lightBalance(user.id) : Promise.resolve(0),
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
      <FeedExperience
        videos={pageFeed.items}
        nextCursor={pageFeed.nextCursor}
        gifts={gifts}
        loggedIn={Boolean(user)}
        viewerName={user?.name ?? null}
        lightBalance={lights}
        initialLowData={Boolean(user?.lowData)}
      />
    </div>
  );
}
