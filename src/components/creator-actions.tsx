"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { useI18n } from "./providers";

export function FamilyJoin({
  creatorId,
  tiers,
  already,
}: {
  creatorId: string;
  tiers: { cents: number; netCents: number }[];
  already: boolean;
}) {
  const { locale, messages: m } = useI18n();
  const router = useRouter();
  const [tier, setTier] = useState(tiers[0]?.cents ?? 500);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch("/api/family", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ creatorId, tierCents: tier, anonymous: false }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNote(m.common.error);
        return;
      }
      setNote(m.gifts.recorded);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack">
      <h2>{already ? m.creator.familyActive : m.creator.family}</h2>
      <p className="muted">{m.creator.familyHint}</p>
      <div className="pair">
        {tiers.map((item) => (
          <button type="button" key={item.cents} className={item.cents === tier ? "btn-primary" : "btn-ghost"} onClick={() => setTier(item.cents)}>
            {formatMoney(item.cents, locale)}
          </button>
        ))}
      </div>
      {note ? <p className="muted">{note}</p> : null}
      <button type="button" className="btn-primary" disabled={busy || already} onClick={join}>
        {m.creator.family}
      </button>
    </div>
  );
}

export function PayoutButton() {
  const { messages: m, locale } = useI18n();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestPayout() {
    setBusy(true);
    try {
      const response = await fetch("/api/payouts", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNote(data.error === "NOTHING_TO_PAY" ? m.wallet.payoutEmpty : m.common.error);
        return;
      }
      setNote(`${m.wallet.payoutDone} ${formatMoney(data.amountCents, locale)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <p className="muted">{m.wallet.payoutStub}</p>
      <button type="button" className="btn-primary" disabled={busy} onClick={requestPayout}>
        {m.wallet.payout}
      </button>
      {note ? <p className="muted">{note}</p> : null}
    </div>
  );
}
