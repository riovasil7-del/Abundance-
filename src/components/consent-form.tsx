"use client";

import { useState } from "react";
import { useI18n } from "./providers";

export function ConsentForm({ token, status }: { token: string; status: "pending" | "approved" | "revoked" }) {
  const { messages: m } = useI18n();
  const [name, setName] = useState("");
  const [guardian, setGuardian] = useState(false);
  const [state, setState] = useState(status);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(action: "approve" | "revoke") {
    setBusy(true);
    setNote(null);
    const response = await fetch(`/api/consent/${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, parentName: name, guardian: guardian || undefined }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setNote(m.common.error);
      return;
    }
    setState(data.status === "revoked" ? "revoked" : "approved");
    setNote(data.status === "revoked" ? m.guardian.revoked : m.guardian.approved);
  }

  return (
    <div className="stack">
      <label className="field">
        <span>{m.guardian.name}</span>
        <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} />
      </label>
      <label className="check-row">
        <input type="checkbox" checked={guardian} onChange={(event) => setGuardian(event.target.checked)} />
        <span>{m.guardian.confirm}</span>
      </label>
      <button className="btn-primary" type="button" disabled={busy || name.trim().length < 2 || !guardian} onClick={() => void send("approve")}>
        {m.guardian.approve}
      </button>
      {state === "approved" ? (
        <button className="btn-ghost" type="button" disabled={busy} onClick={() => void send("revoke")}>
          {m.guardian.revoke}
        </button>
      ) : null}
      {note ? <p className="notice" role="alert">{note}</p> : null}
    </div>
  );
}
