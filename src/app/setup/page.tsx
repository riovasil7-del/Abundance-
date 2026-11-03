"use client";

import { useState } from "react";
import { useI18n } from "@/components/providers";

export default function SetupPage() {
  const { messages: m } = useI18n();
  const [secret, setSecret] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch("/api/setup/seed", {
        method: "POST",
        headers: { "x-seed-secret": secret },
      });
      if (response.status === 404) setNote(m.setup.disabled);
      else if (response.status === 409) setNote(m.setup.already);
      else if (!response.ok) setNote(m.common.error);
      else setNote(m.setup.done);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page stack">
      <div>
        <p className="kicker">{m.live.title}</p>
        <h1>{m.setup.title}</h1>
        <p className="lede">{m.setup.intro}</p>
      </div>
      <label className="field">
        <span>{m.setup.secret}</span>
        <input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="off" />
      </label>
      {note ? <p className="notice">{note}</p> : null}
      <button type="button" className="btn-primary" disabled={busy || secret.length < 8} onClick={run}>
        {m.setup.submit}
      </button>
    </div>
  );
}
