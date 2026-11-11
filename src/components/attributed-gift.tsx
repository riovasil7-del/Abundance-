"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import type { GiftChoice, Receipt } from "@/lib/types";
import { GiftConfirm, useGiftAttempt } from "./gift-confirm";
import { GiftFundNote, GiftPicker } from "./gift-picker";
import { LightsStatus, paymentNote } from "./lights";
import { useI18n } from "./providers";

type Recipient = { creatorId: string; name: string };

export function AttributedGift({
  sessionId,
  gifts,
  initialLightBalance,
}: {
  sessionId: string;
  gifts: GiftChoice[];
  initialLightBalance: number;
}) {
  const { locale, messages: m } = useI18n();
  const [slug, setSlug] = useState(gifts[0]?.slug ?? "");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [lights, setLights] = useState(initialLightBalance);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const chosen = gifts.find((gift) => gift.slug === slug) ?? gifts[0];
  const giftAttempt = useGiftAttempt(chosen?.priceCents ?? 0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/live/sessions/${sessionId}/collab`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.recipients) return;
        setRecipients(data.recipients);
        setRecipientId(data.recipients[0]?.creatorId ?? "");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!chosen) return null;
  const mustChoose = recipients.length > 1;

  async function send() {
    if (!chosen) return;
    if (mustChoose && !recipientId) return;
    await giftAttempt.armOrSend(async (token) => {
      setBusy(true);
      setNote(null);
      try {
        const response = await fetch(`/api/live/sessions/${sessionId}/gifts`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            giftSlug: chosen.slug,
            token,
            ...(recipientId ? { recipientCreatorId: recipientId } : {}),
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setNote(response.status === 402 ? m.gifts.notEnough : m.common.error);
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

  return (
    <section className="stack card" data-screen="attributed-gift">
      <h2>{m.live.gift}</h2>
      {receipt ? (
        <div data-screen="live-gift-receipt">
          <p>{m.gifts.recorded}</p>
          <p className="muted">{paymentNote(receipt.paymentMode, m)}</p>
        </div>
      ) : (
        <>
          {mustChoose ? (
            <fieldset>
              <legend>{m.bond.recipient}</legend>
              {recipients.map((recipient) => (
                <label key={recipient.creatorId} className="check-row">
                  <input
                    type="radio"
                    name="recipient"
                    checked={recipientId === recipient.creatorId}
                    onChange={() => setRecipientId(recipient.creatorId)}
                  />
                  <span>{recipient.name}</span>
                </label>
              ))}
            </fieldset>
          ) : recipients[0] ? (
            <p>
              {m.bond.recipient} {recipients[0].name}
            </p>
          ) : null}
          <GiftPicker gifts={gifts} selected={chosen.slug} onSelect={setSlug} />
          <GiftFundNote gift={chosen} />
          <LightsStatus balance={lights} priceCents={chosen.priceCents} />
          {lights >= chosen.priceCents ? (
            giftAttempt.armed ? (
              <GiftConfirm priceCents={chosen.priceCents} busy={busy} onYes={() => void send()} onNo={giftAttempt.cancel} />
            ) : (
              <button type="button" className="btn-primary" disabled={busy || (mustChoose && !recipientId)} onClick={() => void send()}>
                {m.gifts.send}
              </button>
            )
          ) : null}
        </>
      )}
      {note ? <p className="notice">{note}</p> : null}
    </section>
  );
}
