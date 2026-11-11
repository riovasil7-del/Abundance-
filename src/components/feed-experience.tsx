"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LOCALES } from "@/config/app";
import { LANGUAGE_META } from "@/i18n/meta";
import { formatMoney } from "@/lib/format";
import { capTail, videoPreload } from "@/lib/gift-guard";
import type { FeedVideo, GiftChoice, Receipt } from "@/lib/types";
import { GiftConfirm, useGiftAttempt } from "./gift-confirm";
import { LightsStatus, paymentNote } from "./lights";
import { useI18n } from "./providers";
import { Sheet } from "./sheet";

type FeedView = "forYou" | "following" | "community";
const TOPICS = ["good_deed", "craft", "song", "gratitude", "weaving", "garden", "kitchen"] as const;

export function FeedExperience({
  videos,
  nextCursor = null,
  gifts,
  loggedIn,
  viewerName,
  lightBalance = 0,
}: {
  videos: FeedVideo[];
  nextCursor?: string | null;
  gifts: GiftChoice[];
  loggedIn: boolean;
  viewerName?: string | null;
  lightBalance?: number;
}) {
  const { locale, messages: m } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(videos);
  const [view, setView] = useState<FeedView>("forYou");
  const [cursor, setCursor] = useState<string | null>(nextCursor);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [sheet, setSheet] = useState<null | "gift" | "comments" | "report" | "why" | "tune">(null);
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
  const [lights, setLights] = useState(lightBalance);
  const [needsTap, setNeedsTap] = useState(false);
  const [feedNote, setFeedNote] = useState<string | null>(null);
  const [topics, setTopics] = useState<{ topic: string; interested: boolean }[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [regionCode, setRegionCode] = useState<string | null>(null);

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
    let cancelled = false;
    root.querySelectorAll("video").forEach((video, index) => {
      video.muted = true;
      if (index !== active) {
        video.pause();
        return;
      }
      video.muted = muted;
      if (reduce) {
        video.pause();
        if (!cancelled) setNeedsTap(true);
        return;
      }
      video.play().then(
        () => {
          if (!cancelled) setNeedsTap(false);
        },
        () => {
          if (!cancelled) setNeedsTap(true);
        },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [active, muted, items.length]);

  useEffect(() => {
    const root = rootRef.current;
    return () => {
      root?.querySelectorAll("video").forEach((video) => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      });
    };
  }, []);

  async function loadView(nextView: FeedView, nextCursor: string | null, replace: boolean) {
    const params = new URLSearchParams({ view: nextView });
    if (nextCursor) params.set("cursor", nextCursor);
    const response = await fetch(`/api/feed?${params.toString()}`);
    const data = await response.json().catch(() => ({}));
    if (data.needsLogin) {
      setFeedNote(m.feed.loginFollowing);
      if (replace) {
        setItems([]);
        setActive(0);
      }
      setCursor(null);
      return;
    }
    const incoming = (data.items ?? []) as FeedVideo[];
    setItems((current) => {
      if (replace) return incoming;
      const seen = new Set(current.map((item) => item.id));
      return [...current, ...incoming.filter((item) => !seen.has(item.id))];
    });
    if (replace) setActive(0);
    setCursor(data.nextCursor ?? null);
    setFeedNote(incoming.length === 0 && replace ? (nextView === "following" ? m.feed.emptyFollowing : m.feed.empty) : null);
  }

  async function openTune() {
    if (!loggedIn) {
      window.location.href = "/login";
      return;
    }
    const response = await fetch("/api/feed/preferences");
    if (response.ok) {
      const data = await response.json();
      setTopics(data.topics ?? []);
      setLanguages(data.languages ?? []);
      setRegionCode(data.regionCode ?? null);
    }
    setSheet("tune");
  }

  async function savePreference(body: Record<string, unknown>) {
    const response = await fetch("/api/feed/preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!response.ok) return;
    const data = await response.json();
    setTopics(data.topics ?? []);
    setLanguages(data.languages ?? []);
    setRegionCode(data.regionCode ?? null);
    await loadView(view, null, true);
  }

  useEffect(() => {
    if (!cursor || active < items.length - 1) return;
    let cancelled = false;
    void loadView(view, cursor, false).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
    // cursor advances after a successful page, which is the retry guard
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, cursor, items.length, view]);

  function go(step: number) {
    const root = rootRef.current;
    if (!root) return;
    const next = Math.min(items.length - 1, Math.max(0, active + step));
    const slide = root.querySelector<HTMLElement>(`[data-index="${next}"]`);
    slide?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  const current = items[active];
  const chosen = gifts.find((gift) => gift.slug === giftSlug) ?? gifts[0];
  const giftAttempt = useGiftAttempt(chosen?.priceCents);

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

  function sendGift() {
    if (!current || !chosen) return;
    giftAttempt.armOrSend(async (token) => {
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
            token,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(response.status === 402 ? m.gifts.notEnough : m.common.error);
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

  async function openComments(videoId: string) {
    setSheet("comments");
    setCommentNote(null);
    const response = await fetch(`/api/videos/${videoId}/comments`);
    if (!response.ok) return;
    const data = (await response.json()) as { comments: { id: string; author: string; body: string }[] };
    setComments(capTail(data.comments));
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
        setComments((prev) => capTail([...prev, { id: data.id, author: viewerName || m.me.title, body: draft }]));
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

  const viewLabel = { forYou: m.feed.forYou, following: m.feed.following, community: m.feed.community };
  const topicLabel = (topic: string) =>
    topic in m.deeds ? m.deeds[topic as keyof typeof m.deeds] : topic in m.crafts ? m.crafts[topic as keyof typeof m.crafts] : topic;

  return (
    <div className="feed-page" data-screen="feed">
    <div className="feed-switch" role="tablist" aria-label={m.feed.switcher}>
      {(["forYou", "following", "community"] as const).map((next) => (
        <button
          key={next}
          type="button"
          role="tab"
          id={`feed-tab-${next}`}
          aria-selected={view === next}
          aria-controls="feed-panel"
          onClick={() => {
            setView(next);
            setCursor(null);
            setFeedNote(null);
            void loadView(next, null, true);
          }}
        >
          {viewLabel[next]}
        </button>
      ))}
      <button type="button" onClick={() => void openTune()}>
        {m.feed.tune}
      </button>
    </div>
    <div
      className="feed"
      id="feed-panel"
      role="tabpanel"
      aria-labelledby={`feed-tab-${view}`}
      ref={rootRef}
      tabIndex={0}
      aria-label={m.feed.stage}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          go(1);
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          go(-1);
        }
      }}
    >
      {items.map((video, index) => (
        <article className="slide" data-slide data-index={index} key={video.id}>
          <div className="video-card">
            {video.posterUrl ? <img className="video-poster" src={video.posterUrl} alt="" /> : null}
            <video
              className="video-el"
              poster={video.posterUrl ?? undefined}
              playsInline
              loop
              muted={muted || index !== active}
              preload={videoPreload(index, active)}
              src={Math.abs(index - active) <= 1 ? video.playbackUrl : undefined}
            />
            {index === active && needsTap ? (
              <button
                type="button"
                className="tap-play"
                onClick={() => {
                  const video = rootRef.current?.querySelectorAll("video")[index];
                  if (!video) return;
                  video.muted = muted;
                  void video.play().then(
                    () => setNeedsTap(false),
                    () => setNeedsTap(true),
                  );
                }}
              >
                {m.feed.tapPlay}
              </button>
            ) : null}
            <div className="feed-nav">
              <button type="button" onClick={() => go(-1)} disabled={active === 0} aria-label={m.feed.prev}>
                {m.feed.prev}
              </button>
              <button type="button" onClick={() => go(1)} disabled={active === items.length - 1} aria-label={m.feed.next}>
                {m.feed.next}
              </button>
            </div>
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
              <button type="button" className="why-btn" onClick={() => setSheet("why")}>
                {m.feed.why}
              </button>
              <p>{video.caption}</p>
              <p className="place">
                {video.deedLabel}
                {video.chainCount > 0 ? ` · ${m.feed.chain} ${video.chainCount}` : ""}
              </p>
            </div>
            <div className="video-actions">
              <button type="button" className="action-btn" aria-pressed={!muted} aria-label={muted ? m.feed.unmute : m.feed.mute} onClick={() => setMuted((value) => !value)}>
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
        <Sheet
          title={
            sheet === "gift" ? m.gifts.title : sheet === "comments" ? m.comments.title : sheet === "why" ? m.feed.whyTitle : sheet === "tune" ? m.feed.tune : m.report.title
          }
          onClose={() => setSheet(null)}
        >
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
                  <p className="muted">{paymentNote(receipt.paymentMode, m)}</p>
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
                        <span aria-hidden="true">{gift.symbol}</span>
                        <small>{gift.name}</small>
                        <small>{formatMoney(gift.priceCents, locale)}</small>
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
                  <LightsStatus balance={lights} priceCents={chosen.priceCents} />
                  {error ? <p className="error-text">{error}</p> : null}
                  {lights >= chosen.priceCents ? (
                    giftAttempt.armed ? (
                      <GiftConfirm priceCents={chosen.priceCents} busy={busy} onYes={sendGift} onNo={giftAttempt.cancel} />
                    ) : (
                      <button type="button" className="btn-primary" disabled={busy} onClick={sendGift}>
                        {busy ? m.gifts.sending : m.gifts.send}
                      </button>
                    )
                  ) : null}
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

            {sheet === "why" && current ? (
              <div data-screen="why-feed">
                <p>{m.feed.noPromise}</p>
                <ul>
                  {(current.reasons.length ? current.reasons : ["recent"]).map((reasonCode) => (
                    <li key={reasonCode}>{m.feed.reasons[reasonCode as keyof typeof m.feed.reasons] ?? reasonCode}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {sheet === "tune" ? (
              <div className="stack" data-screen="feed-tune">
                <p className="muted">{m.feed.noPromise}</p>
                {TOPICS.map((topic) => {
                  const row = topics.find((item) => item.topic === topic);
                  return (
                    <div key={topic} className="split-row">
                      <span>{topicLabel(topic)}</span>
                      <span>
                        <button type="button" className={row?.interested ? "choice on" : "choice"} onClick={() => void savePreference({ action: "topic", topic, interested: true })}>
                          {m.feed.interested}
                        </button>
                        <button type="button" className={row && !row.interested ? "choice on" : "choice"} onClick={() => void savePreference({ action: "topic", topic, interested: false })}>
                          {m.feed.notInterested}
                        </button>
                      </span>
                    </div>
                  );
                })}
                {current ? (
                  <button type="button" className="btn-ghost" onClick={() => void savePreference({ action: "hide", creatorId: current.creator.id })}>
                    {m.feed.hideCreator}: {current.creator.displayName}
                  </button>
                ) : null}
                <fieldset>
                  <legend>{m.feed.languages}</legend>
                  {LOCALES.map((code) => (
                    <label key={code} className="check-row">
                      <input
                        type="checkbox"
                        checked={languages.includes(code)}
                        onChange={(event) => {
                          const next = event.target.checked ? [...languages, code].slice(0, 4) : languages.filter((item) => item !== code);
                          setLanguages(next);
                          void savePreference({ action: "languages", languages: next });
                        }}
                      />
                      <span>{LANGUAGE_META[code].nativeName}</span>
                    </label>
                  ))}
                </fieldset>
                <label className="field">
                  <span>{m.feed.region}</span>
                  <select
                    value={regionCode ?? ""}
                    onChange={(event) => void savePreference({ action: "region", regionCode: event.target.value || null })}
                  >
                    <option value="">{m.feed.anywhere}</option>
                    <option value="KE">{m.countries.KE}</option>
                    <option value="SK">{m.countries.SK}</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    void fetch("/api/feed/preferences", { method: "DELETE" }).then(async (response) => {
                      if (!response.ok) return;
                      const data = await response.json();
                      setTopics(data.topics ?? []);
                      setLanguages(data.languages ?? []);
                      setRegionCode(null);
                      await loadView(view, null, true);
                    });
                  }}
                >
                  {m.feed.reset}
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
        </Sheet>
      ) : null}
      {items.length === 0 ? <p className="empty page">{feedNote ?? m.feed.empty}</p> : null}
    </div>
    </div>
  );
}
