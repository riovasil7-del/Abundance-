import Link from "next/link";
import { PayoutButton } from "@/components/creator-actions";
import { LightShop } from "@/components/lights";
import { LIGHT_PACKS } from "@/config/app";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { formatMoney } from "@/lib/format";
import { getCurrentUser } from "@/server/auth";
import { lightBalance, stripeConfigured } from "@/server/credits";
import { loadWallet } from "@/server/wallet";

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ lights?: string }> }) {
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const query = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="page">
        <h1>{messages.wallet.title}</h1>
        <p className="lede">{messages.feed.login}</p>
        <Link className="btn-primary" href="/login">
          {messages.auth.login}
        </Link>
      </div>
    );
  }

  const [wallet, lights] = await Promise.all([
    loadWallet({
      userId: user.id,
      userName: user.name,
      creatorId: user.creatorProfile?.id ?? null,
      locale,
    }),
    lightBalance(user.id),
  ]);
  return (
    <div className="page stack" data-screen="wallet">
      <div>
        <h1>{wallet.mode === "creator" ? messages.wallet.title : messages.wallet.givenTitle}</h1>
        <p className="lede">{messages.wallet.rule}</p>
      </div>

      <section className="wallet-hero" data-screen="lights">
        <div className="muted">{messages.wallet.lightsTitle}</div>
        <div className="money-xl">
          {lights} {messages.wallet.unit}
        </div>
        <p className="lede">{messages.wallet.lightsLead}</p>
        {!stripeConfigured() ? <p className="notice">{messages.wallet.demoNotRevenue}</p> : null}
        {wallet.reviewCents > 0 ? <p className="notice">{messages.wallet.review}</p> : null}
      </section>
      <LightShop
        locale={locale}
        demo={!stripeConfigured()}
        pending={query.lights === "pending"}
        packs={LIGHT_PACKS.map((pack) => ({
          slug: pack.slug,
          priceCents: pack.priceCents,
          lights: pack.lights,
          label: messages.wallet.packs[pack.slug],
        }))}
      />

      {wallet.mode === "creator" ? (
        <section className="wallet-hero">
          <div className="pair">
            <div>
              <div className="muted">{messages.wallet.available}</div>
              <div className="money-xl">{formatMoney(wallet.availableCents, locale)}</div>
            </div>
            <div>
              <div className="muted">{messages.wallet.pending}</div>
              <div className="money-xl">{formatMoney(wallet.pendingCents, locale)}</div>
            </div>
          </div>
          <div className="pair">
            <div>
              <div className="muted">{messages.wallet.frozen}</div>
              <div className="money-xl">{formatMoney(wallet.frozenCents, locale)}</div>
            </div>
            <div>
              <div className="muted">{messages.wallet.paid}</div>
              <div className="money-xl">{formatMoney(wallet.paidCents, locale)}</div>
            </div>
          </div>
          <p className="muted">
            {messages.wallet.earned}: {formatMoney(wallet.earnedCents, locale)}
          </p>
          {wallet.reservedCents > 0 ? (
            <p className="notice">
              {messages.wallet.reserved}: {formatMoney(wallet.reservedCents, locale)}
            </p>
          ) : null}
          {wallet.demoEarningsCents > 0 ? (
            <p className="notice">
              {messages.wallet.demoEarnings}: {formatMoney(wallet.demoEarningsCents, locale)}
            </p>
          ) : null}
          <p className="notice">{messages.wallet.paidNone}</p>
          <p className="muted">{messages.wallet.processingNote}</p>
          <PayoutButton />
        </section>
      ) : (
        <p className="notice">{messages.wallet.creatorsOnly}</p>
      )}

      {wallet.lines.length === 0 ? <p className="empty">{messages.wallet.empty}</p> : null}
      {wallet.lines.map((line) => (
        <article className="card" key={line.id}>
          <div className="row">
            <strong>{line.title}</strong>
            {line.direct ? null : <span className="pill soft">{messages.wallet.circle}</span>}
          </div>
          <p className="muted">{line.detail}</p>
          <p>
            <strong>{formatMoney(wallet.mode === "creator" ? line.shareCents : line.grossCents, locale)}</strong>
          </p>
          {line.holdLabel ? <p className="muted">{line.holdLabel}</p> : null}
        </article>
      ))}
    </div>
  );
}
