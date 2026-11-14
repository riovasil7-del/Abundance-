"use client";

import { useState } from "react";
import { SignInSheet } from "./sign-in-sheet";
import { useI18n } from "./providers";

export function CreatorBond({
  creatorUserId,
  self,
  loggedIn,
  initialFollowing,
  updates,
}: {
  creatorUserId: string;
  self: boolean;
  loggedIn: boolean;
  initialFollowing: boolean;
  updates: { id: string; body: string }[];
}) {
  const { messages: m } = useI18n();
  const [following, setFollowing] = useState(initialFollowing);
  const [posts, setPosts] = useState(updates);
  const [draft, setDraft] = useState("");
  const [thanks, setThanks] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signIn, setSignIn] = useState<"follow" | "support" | null>(null);

  async function toggleFollow() {
    setBusy(true);
    setNote(null);
    try {
      const response = following
        ? await fetch(`/api/follows?creatorUserId=${encodeURIComponent(creatorUserId)}`, { method: "DELETE" })
        : await fetch("/api/follows", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ creatorUserId }),
          });
      if (!response.ok) {
        setNote(m.common.error);
        return;
      }
      setFollowing(!following);
    } finally {
      setBusy(false);
    }
  }

  async function postUpdate() {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch("/api/updates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNote(m.common.error);
        return;
      }
      if (data.status === "FLAGGED") {
        setNote(m.bond.held);
        return;
      }
      setPosts((current) => [{ id: data.id as string, body: draft.trim() }, ...current]);
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  async function sendNote(kind: "THANKS" | "HELPFUL") {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch("/api/encouragements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ toUserId: creatorUserId, kind, body: kind === "THANKS" ? thanks : "" }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 429) {
        setNote(m.auth.rateLimited);
        return;
      }
      if (data.error === "HELD") {
        setNote(m.bond.held);
        return;
      }
      if (!response.ok) {
        setNote(m.common.error);
        return;
      }
      setThanks("");
      setNote(m.bond.thanksSent);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack" data-screen="creator-bond">
      {self ? null : loggedIn ? (
        <button type="button" className={following ? "btn-ghost" : "btn-primary"} disabled={busy} onClick={() => void toggleFollow()}>
          {following ? m.bond.unfollow : m.bond.follow}
        </button>
      ) : (
        <button type="button" className="btn-primary" onClick={() => setSignIn("follow")}>
          {m.bond.follow}
        </button>
      )}
      <h2>{m.bond.updates}</h2>
      {posts.map((post) => (
        <article key={post.id} className="card">
          <p>{post.body}</p>
        </article>
      ))}
      {self ? (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.trim()) void postUpdate();
          }}
        >
          <label>
            {m.bond.updates}
            <textarea value={draft} maxLength={280} placeholder={m.bond.updatePlaceholder} onChange={(event) => setDraft(event.target.value)} />
          </label>
          <button type="submit" className="btn-primary" disabled={busy || draft.trim().length === 0}>
            {m.bond.updateSend}
          </button>
        </form>
      ) : null}
      {loggedIn && !self ? (
        <form
          className="stack"
          data-screen="private-thanks"
          onSubmit={(event) => {
            event.preventDefault();
            if (thanks.trim()) void sendNote("THANKS");
          }}
        >
          <h2>{m.bond.thanksTitle}</h2>
          <p className="muted">{m.bond.thanksHint}</p>
          <textarea value={thanks} maxLength={280} onChange={(event) => setThanks(event.target.value)} />
          <button type="submit" className="btn-primary" disabled={busy || thanks.trim().length === 0}>
            {m.bond.thanksSend}
          </button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => void sendNote("HELPFUL")}>
            {m.bond.reactionSend}
          </button>
        </form>
      ) : null}
      {note ? <p className="notice">{note}</p> : null}
      {signIn ? <SignInSheet reason={signIn} onClose={() => setSignIn(null)} /> : null}
    </section>
  );
}
