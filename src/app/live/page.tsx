import Link from "next/link";
import { LiveNowList } from "@/components/live-now-list";
import { StartLiveButton } from "@/components/start-live-button";
import { TermsGate } from "@/components/terms-gate";
import { CONTENT_CATEGORIES, isContentCategory } from "@/config/app";
import { toPublicLiveCard, visibleLiveSessions } from "@/lib/live-list";
import { termsAreCurrent } from "@/server/terms";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { readLiveKitCredentials } from "@/server/live-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const rows = await db.liveSession.findMany({
    where: { status: "LIVE" },
    include: { host: true },
    orderBy: { startedAt: "desc" },
  });
  const sessions = visibleLiveSessions(rows, category).map(toPublicLiveCard);

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
      <LiveNowList initial={sessions} category={category} />
    </div>
  );
}
