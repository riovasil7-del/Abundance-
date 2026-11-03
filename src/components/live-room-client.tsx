"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import type { GiftChoice, Receipt } from "@/lib/types";
import { useI18n } from "./providers";

const LiveStage = dynamic(() => import("./live-stage").then((mod) => mod.LiveStage), {
  ssr: false,
});

type ChatLine = { id: string; author: string; body: string };

export function LiveRoomClient({
  sessionId,
  title,
  circle,
  hostName,
  configured,
  loggedIn,
  isHost,
  gifts,
}: {
  sessionId: string;
  title: string;
  circle: boolean;
  hostName: string;
  configured: boolean;
  loggedIn: boolean;
  isHost: boolean;
  gifts: GiftChoice[];
}) {
  const { locale, messages: m } = useI18n();
  const [connection, setConnection] = useState<{ url: string; token: string; canPublish: boolean } | null>(null);
  const [audioOnly, setAudioOnly] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const [chatNote, setChatNote] = useState<string | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [slug, setSlug] = useState(gifts[0]?.slug ?? "");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [giftError, setGiftError] = useState<string | null>(null);
  const chosen = gifts.find((gift) => gift.slug === slug) ?? gifts[0];

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    fetch(`/api/live/sessions/${sessionId}/token`, { method: "POST" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setConnectError(data.error === "LIVE_NOT_CONFIGURED" ? m.live.notConfigured : m.live.failed);
          return;
        }
        setConnection({ url: data.url, token: data.token, canPublish: Boolean(data.canPublish) });
      })
      .catch(() => {
        if (!cancelled) setConnectError(m.live.failed);
      });
    return () => {
      cancelled = true;
    };
  }, [configured, sessionId, m.live.failed, m.live.notConfigured]);

  useEffect(() => {
    let stop = false;
    async function pull() {
      const response = await fetch(`/api/live/sessions/${sessionId}/messages`);
      if (!response.ok || stop) return;
      const data = (await response.json()) as { messages: ChatLine[] };
      setMessages(data.messages);
    }
    void pull();
    const timer = window.setInterval(() => void pull(), 4000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [sessionId]);

  async function sendChat() {
    setChatNote(null);
    const response = await fetch(`/api/live/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setChatNote(response.status === 401 ? m.feed.login : m.common.error);
      return;
    }
    if (data.status === "FLAGGED") setChatNote(m.comments.flagged);
    else setDraft("");
  }

  async function sendGift() {
    if (!chosen) return;
    setBusy(true);
    setGiftError(null);
    try {
      const response = await fetch(`/api/live/sessions/${sessionId}/gifts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ giftSlug: chosen.slug, anonymous }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setGiftError(m.common.error);
        return;
      }
      setReceipt(data as Receipt);
    } finally {
      setBusy(false);
    }
  }

  async function endLive() {
    await fetch(`/api/live/sessions/${sessionId}/end`, { method: "POST" });
    setEnded(true);
    setConnection(null);
  }

  if (!configured) {
    return (
      <div className="page stack" data-screen="live-unconfigured">
        <p className="kicker">{m.live.title}</p>
        <h1>{title}</h1>
        <div className="notice">{m.live.notConfigured}</div>
      </div>
    );
  }

  return (
    <div className="page stack" data-screen="live-room">
      <div>
        <p className="kicker">{circle ? m.live.circle : m.live.title}</p>
        <h1>{title}</h1>
        <p className="muted">
          {hostName}
          {connection?.canPublish ? ` · ${m.live.youPublish}` : ` · ${m.live.watching}`}
        </p>
        {circle ? <p className="notice">{m.live.together}</p> : null}
      </div>

      {ended ? <p className="notice">{m.live.ended}</p> : null}
      {connectError ? <p className="notice">{connectError}</p> : null}
      {!connection && !connectError && !ended ? <p className="muted">{m.live.connecting}</p> : null}
      {connection && !ended ? (
        <div className="live-stage">
          <LiveStage
            url={connection.url}
            token={connection.token}
            canPublish={connection.canPublish}
            audioOnly={audioOnly}
            onError={() => setConnectError(m.live.failed)}
          />
        </div>
      ) : null}

      <div className="row">
        <button type="button" className={audioOnly ? "btn-primary" : "btn-ghost"} onClick={() => setAudioOnly((value) => !value)}>
          {audioOnly ? m.live.camera : m.live.audioOnly}
        </button>
        {loggedIn && !isHost ? (
          <button type="button" className="btn-primary" onClick={() => { setReceipt(null); setGiftOpen(true); }}>
            {m.live.gift}
          </button>
        ) : null}
        {isHost && !ended ? (
          <button type="button" className="btn-ghost" onClick={endLive}>
            {m.live.end}
          </button>
        ) : null}
      </div>

      <section className="card stack">
        <h2>{m.live.chat}</h2>
        <p className="muted">{m.comments.hint}</p>
        <div className="live-chat">
          {messages.length === 0 ? <p className="empty">{m.comments.empty}</p> : null}
          {messages.map((message) => (
            <div className="comment" key={message.id}>
              <strong>{message.author}</strong>
              {message.body}
            </div>
          ))}
        </div>
        {loggedIn ? (
          <>
            <textarea value={draft} maxLength={280} onChange={(event) => setDraft(event.target.value)} placeholder={m.comments.placeholder} />
            {chatNote ? <p className="muted">{chatNote}</p> : null}
            <button type="button" className="btn-primary" disabled={draft.trim().length === 0} onClick={sendChat}>
              {m.comments.send}
            </button>
          </>
        ) : (
          <p className="muted">{m.feed.login}</p>
        )}
      </section>

      {giftOpen ? (
        <div className="sheet-back" onClick={() => setGiftOpen(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()} data-screen="live-gift">
            {receipt ? (
              <div data-screen="live-gift-receipt">
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
                  {receipt.shares.map((share) => (
                    <div className="split-row" key={share.name}>
                      <span>{share.name}</span>
                      <span>{formatMoney(share.netCents, locale)}</span>
                    </div>
                  ))}
                </div>
                <p className="muted">{receipt.paymentMode === "stripe" ? m.gifts.stripe : m.gifts.demo}</p>
                <button type="button" className="btn-primary" onClick={() => setGiftOpen(false)}>
                  {m.gifts.close}
                </button>
              </div>
            ) : chosen ? (
              <div className="stack">
                <p className="kicker">{m.live.gift}</p>
                <h2>{circle ? m.live.together : hostName}</h2>
                <div className="gift-grid">
                  {gifts.map((gift) => (
                    <button type="button" key={gift.slug} className={gift.slug === chosen.slug ? "gift-option on" : "gift-option"} onClick={() => setSlug(gift.slug)}>
                      <span>{gift.symbol}</span>
                      <small>{gift.name}</small>
                    </button>
                  ))}
                </div>
                <div className="split">
                  <div className="split-row">
                    <span>{m.gifts.fee}</span>
                    <span>{formatMoney(chosen.feeCents, locale)}</span>
                  </div>
                  <div className="split-row net">
                    <span>{m.gifts.net}</span>
                    <span>{formatMoney(chosen.netCents, locale)}</span>
                  </div>
                </div>
                <label className="check-row">
                  <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
                  <span>{m.gifts.anonymous}</span>
                </label>
                {giftError ? <p className="error-text">{giftError}</p> : null}
                <button type="button" className="btn-primary" disabled={busy} onClick={sendGift}>
                  {busy ? m.gifts.sending : m.gifts.send}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
