"use client";

import { useEffect, useState } from "react";
import { useI18n } from "./providers";

type Collab = {
  maxCohosts: number;
  isHost: boolean;
  canPublish: boolean;
  pendingForMe: { id: string } | null;
  invites: { id: string; inviteeId: string; name: string; status: string }[];
  candidates: { userId: string; displayName: string }[];
  recipients: { creatorId: string; userId: string; name: string }[];
};

export function CollabPanel({ sessionId, loggedIn }: { sessionId: string; loggedIn: boolean }) {
  const { messages: m } = useI18n();
  const [view, setView] = useState<Collab | null>(null);
  const [inviteeId, setInviteeId] = useState("");
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch(`/api/live/sessions/${sessionId}/collab`);
    if (!response.ok) return;
    const data = (await response.json()) as Collab;
    setView(data);
    setInviteeId((current) => current || data.candidates[0]?.userId || "");
  }

  useEffect(() => {
    void load();
  }, [sessionId]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch(`/api/live/sessions/${sessionId}/collab`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNote(data.error === "FULL" ? m.bond.maxCohosts : data.error === "CONSENT_REQUIRED" ? m.bond.consent : m.common.error);
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!view) return null;
  const openCount = view.invites.filter((invite) => invite.status === "PENDING" || invite.status === "ACCEPTED").length;

  return (
    <section className="stack card" data-screen="collab">
      <h2>{m.bond.cohosts}</h2>
      <p className="muted">{m.bond.maxCohosts}</p>
      {!view.canPublish ? <p>{m.bond.viewersWatch}</p> : null}
      {view.pendingForMe ? (
        <form
          className="stack"
          data-screen="collab-invite"
          onSubmit={(event) => {
            event.preventDefault();
            void post({ inviteId: view.pendingForMe?.id, action: "accept", consent });
          }}
        >
          <p>{m.bond.pending}</p>
          <label className="check-row">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>{m.bond.consent}</span>
          </label>
          <button type="submit" className="btn-primary" disabled={busy || !consent}>
            {m.bond.accept}
          </button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => void post({ inviteId: view.pendingForMe?.id, action: "decline" })}>
            {m.bond.decline}
          </button>
        </form>
      ) : null}
      {view.isHost ? (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (inviteeId) void post({ inviteeId });
          }}
        >
          <label>
            {m.bond.invite}
            <select value={inviteeId} onChange={(event) => setInviteeId(event.target.value)}>
              {view.candidates.map((candidate) => (
                <option key={candidate.userId} value={candidate.userId}>
                  {candidate.displayName}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-primary" disabled={busy || !inviteeId || openCount >= view.maxCohosts}>
            {m.bond.inviteSend}
          </button>
        </form>
      ) : null}
      <ul className="stack">
        {view.invites
          .filter((invite) => invite.status === "PENDING" || invite.status === "ACCEPTED")
          .map((invite) => (
            <li key={invite.id} className="split-row">
              <span>
                {invite.name} · {invite.status === "ACCEPTED" ? m.bond.cohostJoined : m.bond.inviteSend}
              </span>
              {view.isHost ? (
                <button type="button" className="btn-ghost" disabled={busy} onClick={() => void post({ inviteId: invite.id, action: "revoke" })}>
                  {m.bond.revoke}
                </button>
              ) : null}
            </li>
          ))}
      </ul>
      {note ? <p className="notice">{note}</p> : null}
      {loggedIn ? null : <p className="muted">{m.feed.login}</p>}
    </section>
  );
}
