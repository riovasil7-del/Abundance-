"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/lib/format";
import type { Locale } from "@/config/app";
import { useI18n } from "./providers";

export function paymentNote(mode: string, messages: { gifts: { stripe: string; demo: string; paidWithLights: string } }): string {
  if (mode === "stripe" || mode === "STRIPE") return messages.gifts.stripe;
  if (mode === "credits" || mode === "CREDITS") return messages.gifts.paidWithLights;
  return messages.gifts.demo;
}

export function LightsStatus({ balance, priceCents }: { balance: number; priceCents: number }) {
  const { messages: m } = useI18n();
  const short = balance < priceCents;
  return (
    <div className="stack">
      <p className="muted">
        {m.gifts.lightsLeft}: {balance} {m.wallet.unit}
      </p>
      {short ? (
        <>
          <p className="error-text">{m.gifts.notEnough}</p>
          <Link className="btn-primary" href="/wallet">
            {m.gifts.topUp}
          </Link>
        </>
      ) : null}
    </div>
  );
}

export function LightShop({
  packs,
  demo,
  locale,
  pending,
}: {
  packs: { slug: string; priceCents: number; lights: number; label: string }[];
  demo: boolean;
  locale: Locale;
  pending: boolean;
}) {
  const router = useRouter();
  const { messages: m } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(pending ? m.wallet.pendingStripe : null);
  const [error, setError] = useState<string | null>(null);

  async function buy(slug: string) {
    setBusy(slug);
    setError(null);
    try {
      const response = await fetch("/api/credits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packSlug: slug, token: crypto.randomUUID() }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 429) {
        setError(m.auth.rateLimited);
        return;
      }
      if (!response.ok) {
        setError(m.common.error);
        return;
      }
      if (data.url) {
        window.location.href = data.url as string;
        return;
      }
      setNote(m.wallet.bought);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="stack">
      <h2>{m.wallet.shop}</h2>
      <p className="muted">{demo ? m.wallet.packDemo : m.wallet.packStripe}</p>
      {note ? <p className="notice">{note}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {packs.map((pack) => (
        <article className="card" key={pack.slug}>
          <div className="row">
            <strong>{pack.label}</strong>
            <span>{formatMoney(pack.priceCents, locale)}</span>
          </div>
          <p className="muted">
            {pack.lights} {m.wallet.unit}
          </p>
          <button type="button" className="btn-primary" disabled={busy !== null} onClick={() => void buy(pack.slug)}>
            {busy === pack.slug ? m.wallet.buying : m.wallet.buy}
          </button>
        </article>
      ))}
    </section>
  );
}
