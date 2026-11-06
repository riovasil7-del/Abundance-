import Link from "next/link";
import { PayoutButton } from "@/components/creator-actions";
import { LightShop } from "@/components/lights";
import { LIGHT_PACKS, PLATFORM_FEE_DENOMINATOR, PLATFORM_FEE_NUMERATOR } from "@/config/app";
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
  const feeLabel = `${PLATFORM_FEE_NUMERATOR}%`;
  const netLabel = `${PLATFORM_FEE_DENOMINATOR - PLATFORM_FEE_NUMERATOR}%`;

  return (
    <div className="page stack" data-screen="wallet">
      <div>
        <p className="kicker">
          {feeLabel} / {netLabel}
        </p>
        <h1>{wallet.mode === "creator" ? messages.wallet.title : messages.wallet.givenTitle}</h1>
        <p className="lede">{messages.wallet.rule}</p>
      </div>

      <section className="wallet-hero" data-screen="lights">
        <div className="muted">{messages.wallet.lightsTitle}</div>
        <div className="money-xl">
          {lights} {messages.wallet.unit}
        </div>
        <p className="lede">{messages.wallet.lightsLead}</p>
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
            {line.direct ? <span className="pill">85%</span> : <span className="pill soft">{messages.wallet.circle}</span>}
          </div>
          <p className="muted">{line.detail}</p>
          <div className="split">
            <div className="split-row">
              <span>{messages.wallet.gross}</span>
              <span>{formatMoney(line.grossCents, locale)}</span>
            </div>
            <div className="split-row">
              <span>{messages.wallet.fee}</span>
              <span>{formatMoney(line.feeCents, locale)}</span>
            </div>
            <div className="split-row net">
              <span>{messages.wallet.net}</span>
              <span>{formatMoney(line.netCents, locale)}</span>
            </div>
            {line.shareCents !== line.netCents ? (
              <div className="split-row">
                <span>{messages.circles.shared}</span>
                <span>{formatMoney(line.shareCents, locale)}</span>
              </div>
            ) : null}
          </div>
          {line.holdLabel ? <p className="muted">{line.holdLabel}</p> : null}
        </article>
      ))}
    </div>
  );
}
