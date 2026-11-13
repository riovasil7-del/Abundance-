"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "./providers";

export function AgeGate({ mode }: { mode: "ask" | "parent" | null }) {
  const { messages: m } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<"ask" | "parent">(mode === "parent" ? "parent" : "ask");
  const [birth, setBirth] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
  if (!mode || closed) return null;

  async function declare(body: Record<string, unknown>) {
    setBusy(true);
    setNote(null);
    const response = await fetch("/api/account/age", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setNote(m.common.error);
      return;
    }
    if (data.adult) {
      router.refresh();
      return;
    }
    setStep("parent");
    router.refresh();
  }

  async function sendParent() {
    setBusy(true);
    setNote(null);
    const response = await fetch("/api/account/guardian", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parentEmail: email }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setNote(m.common.error);
      return;
    }
    setLink(typeof data.link === "string" ? data.link : null);
    setNote(data.sent ? m.guardian.sent : m.guardian.linkReady);
  }

  return (
    <div className="age-gate" role="presentation">
      <div className="sheet stack" role="dialog" aria-modal="true" aria-label={m.guardian.ask}>
        {step === "ask" ? (
          <>
            <h2>{m.guardian.ask}</h2>
            <p>{m.guardian.notCheck}</p>
            <label className="field">
              <span>{m.guardian.birth}</span>
              <input type="date" value={birth} onChange={(event) => setBirth(event.target.value)} />
            </label>
            <button className="btn-primary" type="button" disabled={busy || !birth} onClick={() => void declare({ birthDate: birth })}>
              {m.common.save}
            </button>
            <div className="pair">
              <button className="btn-primary" type="button" disabled={busy} onClick={() => void declare({ adult: true })}>
                {m.guardian.adult}
              </button>
              <button className="btn-ghost" type="button" disabled={busy} onClick={() => void declare({ minor: true })}>
                {m.guardian.minor}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>{m.guardian.title}</h2>
            <p>{m.guardian.locked}</p>
            <p>{m.guardian.noLive}</p>
            <p>{m.guardian.noGifts}</p>
            <label className="field">
              <span>{m.guardian.parentEmail}</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <button className="btn-primary" type="button" disabled={busy || !email.includes("@")} onClick={() => void sendParent()}>
              {m.guardian.send}
            </button>
            {link ? <p className="notice">{link}</p> : null}
            {mode === "parent" ? (
              <button className="btn-ghost" type="button" onClick={() => setClosed(true)}>
                {m.common.back}
              </button>
            ) : null}
          </>
        )}
        {note ? <p className="notice" role="alert">{note}</p> : null}
      </div>
    </div>
  );
}
