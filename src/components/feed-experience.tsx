"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";
import type { FeedVideo, GiftChoice, Receipt } from "@/lib/types";
import { useI18n } from "./providers";

export function FeedExperience({
  videos,
  gifts,
  loggedIn,
  viewerName,
}: {
  videos: FeedVideo[];
  gifts: GiftChoice[];
  loggedIn: boolean;
  viewerName?: string | null;
}) {
  const { locale, messages: m } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(videos);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [sheet, setSheet] = useState<null | "gift" | "comments" | "report">(null);
  const [giftSlug, setGiftSlug] = useState(gifts[0]?.slug ?? "");
  const [anonymous, setAnonymous] = useState(false);
  const [forwardId, setForwardId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [comments, setComments] = useState<{ id: string; author: string; body: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [commentNote, setCommentNote] = useState<string | null>(null);
  const [reason, setReason] = useState("other");
  const [reportNote, setReportNote] = useState<string | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const slides = [...root.querySelectorAll<HTMLElement>("[data-slide]")];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root, threshold: 0.65 },
    );
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [items.length]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.querySelectorAll("video").forEach((video, index) => {
      video.muted = muted;
      if (index === active && !reduce) video.play().catch(() => undefined);
      else video.pause();
    });
  }, [active, muted, items.length]);

  const current = items[active];
  const chosen = gifts.find((gift) => gift.slug === giftSlug) ?? gifts[0];

  async function bless(video: FeedVideo) {
    if (!loggedIn) {
      window.location.href = "/login";
      return;
    }
    const response = await fetch(`/api/videos/${video.id}/bless`, { method: "POST" });
    if (!response.ok) return;
    const data = (await response.json()) as { blessed: boolean };
    setItems((prev) =>
      prev.map((item) =>
        item.id === video.id
          ? {
              ...item,
              blessedByMe: data.blessed,
              blessingCount: item.blessingCount + (data.blessed ? 1 : -1),
            }
          : item,
      ),
    );
  }

  async function sendGift() {
    if (!current || !chosen) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          giftSlug: chosen.slug,
          videoId: current.id,
          anonymous,
          payItForwardFromId: forwardId || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(m.common.error);
        return;
      }
      setReceipt(data as Receipt);
    } finally {
      setBusy(false);
    }
  }

  async function openComments(videoId: string) {
    setSheet("comments");
    setCommentNote(null);
    const response = await fetch(`/api/videos/${videoId}/comments`);
    if (!response.ok) return;
    const data = (await response.json()) as { comments: { id: string; author: string; body: string }[] };
    setComments(data.comments);
  }

  async function sendComment() {
    if (!current) return;
    setBusy(true);
    setCommentNote(null);
    try {
      const response = await fetch(`/api/videos/${current.id}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      const data = await response.json();
      if (!response.ok) {
        setCommentNote(m.common.error);
        return;
      }
      if (data.status === "FLAGGED") {
        setCommentNote(m.comments.flagged);
      } else {
        setComments((prev) => [...prev, { id: data.id, author: viewerName || m.me.title, body: draft }]);
        setDraft("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function sendReport() {
    if (!current) return;
    setBusy(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType: "VIDEO", targetId: current.id, reason, details: "" }),
      });
      setReportNote(response.ok ? m.report.sent : m.common.error);
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return <p className="page empty">{m.feed.empty}</p>;
  }

  return (
    <div className="feed" ref={rootRef} data-screen="feed">
      {items.map((video, index) => (
        <article className="slide" data-slide data-index={index} key={video.id}>
          <div className="video-card">
            {video.posterUrl ? <img className="video-poster" src={video.posterUrl} alt="" /> : null}
            <video
              className="video-el"
              poster={video.posterUrl ?? undefined}
              playsInline
              loop
              muted={muted}
              preload={Math.abs(index - active) <= 1 ? "metadata" : "none"}
              src={Math.abs(index - active) <= 1 ? video.playbackUrl : undefined}
            />
            <div className="video-shade" />
            <div className="video-copy">
              <div className="creator-line">
                <img className="avatar" src={video.creator.avatarUrl} alt="" />
                <div>
                  <Link href={`/creator/${video.creator.slug}`}>{video.creator.displayName}</Link>
                  <div className="place">
                    {video.creator.place} · {video.creator.verification}
                  </div>
                </div>
              </div>
              <h2>{video.title}</h2>
              <p>{video.caption}</p>
              <p className="place">
                {video.deedLabel}
                {video.chainCount > 0 ? ` · ${m.feed.chain} ${video.chainCount}` : ""}
              </p>
            </div>
            <div className="video-actions">
              <button type="button" className="action-btn" onClick={() => setMuted((value) => !value)}>
                <strong>{muted ? "♪" : "♫"}</strong>
                {muted ? m.feed.unmute : m.feed.mute}
              </button>
              <button type="button" className={video.blessedByMe ? "action-btn on" : "action-btn"} onClick={() => bless(video)}>
                <strong>{video.blessingCount}</strong>
                {video.blessedByMe ? m.feed.blessed : m.feed.bless}
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => {
                  if (!loggedIn) {
                    window.location.href = "/login";
                    return;
                  }
                  setReceipt(null);
                  setError(null);
                  setSheet("gift");
                }}
              >
                <strong>✦</strong>
                {m.feed.gift}
              </button>
              <button type="button" className="action-btn" onClick={() => (loggedIn ? openComments(video.id) : (window.location.href = "/login"))}>
                <strong>{video.commentCount}</strong>
                {m.feed.comments}
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => {
                  if (!loggedIn) {
                    window.location.href = "/login";
                    return;
                  }
                  setReportNote(null);
                  setSheet("report");
                }}
              >
                <strong>!</strong>
                {m.feed.report}
              </button>
            </div>
          </div>
        </article>
      ))}

      {sheet ? (
        <div className="sheet-back" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            {sheet === "gift" && current && chosen ? (
              receipt ? (
                <div data-screen="gift-receipt">
                  <p className="kicker">{m.gifts.receiptTitle}</p>
                  <div className="net-hero">
                    <span>85%</span>
                    <strong>{formatMoney(receipt.netCents, locale)}</strong>
                  </div>
                  <p>
                    {receipt.shares.map((share) => share.name).join(", ")} · {m.gifts.net}
                  </p>
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
                  <p className="muted">{receipt.paymentMode === "stripe" ? m.gifts.stripe : m.gifts.demo}</p>
                  <button type="button" className="btn-primary" onClick={() => setSheet(null)}>
                    {m.gifts.close}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="kicker">{m.gifts.title}</p>
                  <h2>
                    {current.creator.displayName}
                  </h2>
                  <div className="gift-grid" style={{ marginTop: 12 }}>
                    {gifts.map((gift) => (
                      <button
                        type="button"
                        key={gift.slug}
                        className={gift.slug === chosen.slug ? "gift-option on" : "gift-option"}
                        onClick={() => setGiftSlug(gift.slug)}
                      >
                        <span>{gift.symbol}</span>
                        <small>{gift.name}</small>
                      </button>
                    ))}
                  </div>
                  <p className="muted">{m.gifts.preview}</p>
                  <div className="split">
                    <div className="split-row">
                      <span>{m.gifts.gross}</span>
                      <span>{formatMoney(chosen.priceCents, locale)}</span>
                    </div>
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
                    <span>
                      {m.gifts.anonymous}
                      <br />
                      <span className="muted">{m.gifts.anonymousHint}</span>
                    </span>
                  </label>
                  {current.recentGifts.length > 0 ? (
                    <label className="field">
                      <span>{m.gifts.forward}</span>
                      <select value={forwardId} onChange={(event) => setForwardId(event.target.value)}>
                        <option value="">{m.gifts.forwardNone}</option>
                        {current.recentGifts.map((gift) => (
                          <option key={gift.id} value={gift.id}>
                            {gift.label}
                            {gift.anonymous ? "" : gift.donorName ? ` · ${gift.donorName}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {error ? <p className="error-text">{error}</p> : null}
                  <button type="button" className="btn-primary" disabled={busy} onClick={sendGift}>
                    {busy ? m.gifts.sending : m.gifts.send}
                  </button>
                </div>
              )
            ) : null}

            {sheet === "comments" && current ? (
              <div>
                <p className="kicker">{m.comments.title}</p>
                <p className="muted">{m.comments.hint}</p>
                {comments.length === 0 ? <p className="empty">{m.comments.empty}</p> : null}
                {comments.map((comment) => (
                  <div className="comment" key={comment.id}>
                    <strong>{comment.author}</strong>
                    {comment.body}
                  </div>
                ))}
                <label className="field">
                  <span>{m.comments.placeholder}</span>
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={280} />
                </label>
                {commentNote ? <p className="muted">{commentNote}</p> : null}
                <button type="button" className="btn-primary" disabled={busy || draft.trim().length === 0} onClick={sendComment}>
                  {m.comments.send}
                </button>
              </div>
            ) : null}

            {sheet === "report" ? (
              <div>
                <p className="kicker">{m.report.title}</p>
                <label className="field">
                  <span>{m.report.title}</span>
                  <select value={reason} onChange={(event) => setReason(event.target.value)}>
                    <option value="begging">{m.report.begging}</option>
                    <option value="humiliation">{m.report.humiliation}</option>
                    <option value="consent">{m.report.consent}</option>
                    <option value="spam">{m.report.spam}</option>
                    <option value="other">{m.report.other}</option>
                  </select>
                </label>
                {reportNote ? <p className="muted">{reportNote}</p> : null}
                <button type="button" className="btn-primary" disabled={busy} onClick={sendReport}>
                  {m.report.send}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
