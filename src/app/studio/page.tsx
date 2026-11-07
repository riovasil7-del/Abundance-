import Link from "next/link";
import { StudioDesk } from "@/components/studio-desk";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { formatMoney } from "@/lib/format";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { loadWallet } from "@/server/wallet";

export default async function StudioPage() {
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="page">
        <h1>{messages.studio.title}</h1>
        <Link href="/login">{messages.auth.login}</Link>
      </div>
    );
  }
  if (!user.creatorProfile) {
    return (
      <div className="page stack">
        <h1>{messages.studio.title}</h1>
        <p>{messages.upload.needCreator}</p>
      </div>
    );
  }
  const [stories, wallet] = await Promise.all([
    db.video.findMany({
      where: { creatorId: user.creatorProfile.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    loadWallet({
      userId: user.id,
      userName: user.name,
      creatorId: user.creatorProfile.id,
      locale,
    }),
  ]);

  return (
    <div className="page stack">
      <div>
        <p className="kicker">{messages.studio.earnings}</p>
        <h1>{messages.studio.title}</h1>
        <p className="muted">{messages.wallet.paidNone}</p>
      </div>
      <section className="wallet-hero" data-screen="studio-earnings">
        <div className="pair">
          <div>
            <div className="muted">{messages.wallet.pending}</div>
            <strong>{formatMoney(wallet.pendingCents, locale)}</strong>
          </div>
          <div>
            <div className="muted">{messages.wallet.available}</div>
            <strong>{formatMoney(wallet.availableCents, locale)}</strong>
          </div>
        </div>
        <div className="pair">
          <div>
            <div className="muted">{messages.wallet.frozen}</div>
            <strong>{formatMoney(wallet.frozenCents, locale)}</strong>
          </div>
          <div>
            <div className="muted">{messages.wallet.paid}</div>
            <strong>{formatMoney(wallet.paidCents, locale)}</strong>
          </div>
        </div>
      </section>
      <section className="stack">
        <h2>{messages.studio.recent}</h2>
        {stories.map((story) => (
          <article key={story.id} className="card">
            <strong>{story.title}</strong>
            <p className="muted">
              {story.visibility} · {story.mediaKind}
            </p>
          </article>
        ))}
      </section>
      <StudioDesk
        ownerId={user.id}
        stories={stories.map((story) => ({
          id: story.id,
          title: story.title,
          caption: story.caption,
          visibility: story.visibility,
          captionsVtt: story.captionsVtt,
        }))}
      />
      <Link href="/upload">{messages.nav.upload}</Link>
    </div>
  );
}
