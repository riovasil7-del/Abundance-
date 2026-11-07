"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import type { GiftChoice, Receipt } from "@/lib/types";
import { GiftConfirm, useGiftAttempt } from "./gift-confirm";
import { LightsStatus, paymentNote } from "./lights";
import { useI18n } from "./providers";

export type CircleGift = GiftChoice & { shares: { name: string; netCents: number }[] };

export function CircleDonate({
  circleId,
  gifts,
  enabled,
  lightBalance = 0,
}: {
  circleId: string;
  gifts: CircleGift[];
  enabled: boolean;
  lightBalance?: number;
}) {
  const { locale, messages: m } = useI18n();
  const [slug, setSlug] = useState(gifts[0]?.slug ?? "");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [lights, setLights] = useState(lightBalance);
  const chosen = gifts.find((gift) => gift.slug === slug) ?? gifts[0];
  const giftAttempt = useGiftAttempt(chosen?.priceCents);

  function send() {
    if (!chosen) return;
    giftAttempt.armOrSend(async (token) => {
      setBusy(true);
      setError(null);
      try {
        const response = await fetch(`/api/circles/${circleId}/donations`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ giftSlug: chosen.slug, anonymous, token }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(response.status === 402 ? m.gifts.notEnough : m.common.error);
          return false;
        }
        if (typeof data.lightBalance === "number") setLights(data.lightBalance);
        setReceipt(data as Receipt);
        return true;
      } finally {
        setBusy(false);
      }
    });
  }

  if (!chosen) return null;
  if (receipt) {
    return (
      <div className="card" data-screen="circle-receipt">
        <p className="kicker">{m.gifts.receiptTitle}</p>
        <div className="net-hero">
          <span>85%</span>
          <strong>{formatMoney(receipt.netCents, locale)}</strong>
        </div>
        <div className="split">
          <div className="split-row">
            <span>{m.gifts.gross}</span>
            <span>{formatMoney(receipt.grossCents, locale)}</span>
          </div>
          <div className="split-row">
            <span>{m.gifts.fee}</span>
            <span>{formatMoney(receipt.feeCents, locale)}</span>
          </div>
          <div className="split-row net">
            <span>{m.gifts.net}</span>
            <span>{formatMoney(receipt.netCents, locale)}</span>
          </div>
        </div>
        {receipt.shares.map((share) => (
          <div className="split-row" key={share.name}>
            <span>{share.name}</span>
            <span>{formatMoney(share.netCents, locale)}</span>
          </div>
        ))}
        <p className="muted">{paymentNote(receipt.paymentMode, m)}</p>
      </div>
    );
  }

  return (
    <div className="card stack">
      <h2>{m.circles.donate}</h2>
      <p className="muted">{m.gifts.circleNet}</p>
      <div className="gift-grid">
        {gifts.map((gift) => (
          <button type="button" key={gift.slug} className={gift.slug === chosen.slug ? "gift-option on" : "gift-option"} onClick={() => setSlug(gift.slug)}>
            <span>{gift.symbol}</span>
            <small>{gift.name}</small>
          </button>
        ))}
      </div>
      <p className="kicker">{m.circles.preview}</p>
      <div className="split">
        <div className="split-row">
          <span>15%</span>
          <span>{formatMoney(chosen.feeCents, locale)}</span>
        </div>
        <div className="split-row net">
          <span>85%</span>
          <span>{formatMoney(chosen.netCents, locale)}</span>
        </div>
        {chosen.shares.map((share) => (
          <div className="split-row" key={share.name}>
            <span>{share.name}</span>
            <span>{formatMoney(share.netCents, locale)}</span>
          </div>
        ))}
      </div>
      <label className="check-row">
        <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
        <span>{m.gifts.anonymous}</span>
      </label>
      <LightsStatus balance={lights} priceCents={chosen.priceCents} />
      {error ? <p className="error-text">{error}</p> : null}
      {!enabled ? <p className="muted">{m.circles.noVerified}</p> : null}
      {enabled && lights >= chosen.priceCents ? (
        giftAttempt.armed ? (
          <GiftConfirm priceCents={chosen.priceCents} busy={busy} onYes={send} onNo={giftAttempt.cancel} />
        ) : (
          <button type="button" className="btn-primary" disabled={busy} onClick={send}>
            {busy ? m.gifts.sending : m.circles.donate}
          </button>
        )
      ) : null}
    </div>
  );
}
