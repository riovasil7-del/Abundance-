"use client";

import { useEffect, useRef, useState } from "react";
import { GIFT_CONFIRM_CENTS } from "@/config/app";
import { formatMoney } from "@/lib/format";
import { needsGiftConfirm, rememberGiftToken } from "@/lib/gift-guard";
import { useI18n } from "./providers";

export function useGiftAttempt(priceCents: number | undefined) {
  const [armed, setArmed] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const needs = priceCents != null && needsGiftConfirm(priceCents);
  useEffect(() => {
    setArmed(false);
    tokenRef.current = null;
  }, [priceCents]);

  function armOrSend(send: (token: string) => Promise<boolean>) {
    if (needs && !armed) {
      setArmed(true);
      return;
    }
    const token = rememberGiftToken(tokenRef.current, () => crypto.randomUUID());
    tokenRef.current = token;
    void send(token).then((ok) => {
      if (ok) {
        tokenRef.current = null;
        setArmed(false);
      }
    });
  }

  function cancel() {
    setArmed(false);
    tokenRef.current = null;
  }

  return { armed: needs && armed, armOrSend, cancel };
}

export function GiftConfirm({
  priceCents,
  busy,
  onYes,
  onNo,
}: {
  priceCents: number;
  busy: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  const { locale, messages: m } = useI18n();
  return (
    <div className="stack" data-screen="gift-confirm">
      <h2>{m.gifts.confirmAsk}</h2>
      <p>
        {m.gifts.fiat}: {formatMoney(priceCents, locale)}
      </p>
      <p className="muted">
        {m.gifts.confirmNote} {formatMoney(GIFT_CONFIRM_CENTS, locale)}
      </p>
      <div className="row">
        <button type="button" className="btn-ghost" onClick={onNo}>
          {m.gifts.confirmNo}
        </button>
        <button type="button" className="btn-primary" style={{ width: "auto" }} disabled={busy} onClick={onYes}>
          {busy ? m.gifts.sending : m.gifts.confirmYes}
        </button>
      </div>
    </div>
  );
}
