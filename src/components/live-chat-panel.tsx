"use client";

import { useEffect, useState } from "react";
import { CHAT_REPORT_REASONS, deliverRoomLines, type RoomLine } from "@/lib/live-chat";
import { useI18n } from "./providers";

type Menu = { authorId: string; author: string; messageId: string; body: string } | null;

export function LiveChatPanel({
  sessionId,
  loggedIn,
  canModerate,
  translateEnabled,
}: {
  sessionId: string;
  loggedIn: boolean;
  canModerate: boolean;
  translateEnabled: boolean;
}) {
  const { messages: m } = useI18n();
  const [lines, setLines] = useState<RoomLine[]>([]);
  const [draft, setDraft] = useState("");
  const [paused, setPaused] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const [reason, setReason] = useState<(typeof CHAT_REPORT_REASONS)[number]>("harassment");
  const [reportNote, setReportNote] = useState("");
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    let stop = false;
    async function pull() {
      const response = await fetch(`/api/live/sessions/${sessionId}/messages`);
      if (!response.ok || stop) return;
      const data = (await response.json()) as { lines?: RoomLine[] };
      if (!paused) setLines(deliverRoomLines({ lines: data.lines ?? [] }));
    }
    void pull();
    const timer = window.setInterval(() => void pull(), 1500);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [paused, sessionId]);

  useEffect(() => {
    if (!loggedIn) return;
    void fetch(`/api/live/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "join" }),
    });
  }, [loggedIn, sessionId]);

  async function send() {
    setNote(null);
    const response = await fetch(`/api/live/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 429) {
      setNote(m.auth.rateLimited);
      return;
    }
    if (response.status === 403 && data.error === "CHAT_MUTED") {
      setNote(m.live.chatMuted);
      return;
    }
    if (!response.ok) {
      setNote(response.status === 401 ? m.feed.login : m.common.error);
      return;
    }
    if (data.status === "FLAGGED") {
      setNote(m.comments.flagged);
      return;
    }
    setDraft("");
  }

  async function exclude() {
    if (!menu) return;
    await fetch("/api/blocks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: menu.authorId }),
    });
    setLines((current) => current.filter((line) => line.authorId !== menu.authorId));
    setMenu(null);
    setNote(m.live.blocked);
  }

  async function removeForEveryone() {
    if (!menu) return;
    const response = await fetch(`/api/live/sessions/${sessionId}/mute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: menu.authorId }),
    });
    if (response.status === 403) {
      setNote(m.common.error);
      return;
    }
    setLines((current) => current.filter((line) => line.authorId !== menu.authorId));
    setMenu(null);
    setNote(m.live.removedAll);
  }

  async function sendReport() {
    if (!menu) return;
    setReporting(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetType: "LIVE_CHAT",
          targetId: menu.messageId,
          reason,
          details: [`message: ${menu.body}`, reportNote.trim() ? `note: ${reportNote.trim()}` : ""].filter(Boolean).join("\n"),
        }),
      });
      setNote(response.status === 429 ? m.auth.rateLimited : response.ok ? m.report.sent : m.common.error);
      if (response.ok) {
        setMenu(null);
        setReportNote("");
      }
    } finally {
      setReporting(false);
    }
  }

  function label(line: RoomLine) {
    if (line.kind === "join") return m.live.joined.replace("{name}", line.author);
    if (line.kind === "gift") return m.live.giftLine.replace("{name}", line.author || m.common.anonymous).replace("{gift}", line.body);
    return "";
  }

  return (
    <>
      <div className="live-chat-stream" data-screen="live-chat" aria-live={paused ? "off" : "polite"}>
        <button type="button" className="chat-pause" onClick={() => setPaused((value) => !value)}>
          {paused ? m.live.chatResume : m.live.chatPause}
        </button>
        {lines.map((line) => (
          <div className={line.kind === "chat" ? "live-chat-line" : "live-chat-line live-chat-quiet"} key={line.id}>
            {line.kind === "chat" ? (
              <button type="button" className="live-chat-author" onClick={() => setMenu({ authorId: line.authorId, author: line.author, messageId: line.id, body: line.body })}>
                {line.author}
              </button>
            ) : (
              <span>{label(line)}</span>
            )}
            {line.kind === "chat" ? <span> {line.body}</span> : null}
            {translateEnabled && line.kind === "chat" ? (
              <button type="button" className="live-chat-author">{m.live.translate}</button>
            ) : null}
          </div>
        ))}
      </div>
      <form
        className="live-compose"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) void send();
        }}
      >
        <input
          value={draft}
          maxLength={280}
          placeholder={loggedIn ? m.live.chatPlaceholder : m.feed.login}
          disabled={!loggedIn}
          onChange={(event) => setDraft(event.target.value)}
          aria-label={m.live.chat}
        />
        <button type="submit" disabled={!loggedIn || draft.trim().length === 0}>
          {m.comments.send}
        </button>
      </form>
      {note ? <p className="live-note">{note}</p> : null}
      {menu ? (
        <div className="live-chat-menu" data-screen="chat-menu">
          <strong>{menu.author}</strong>
          <button type="button" onClick={() => void exclude()}>{m.live.excludeMine}</button>
          <button type="button" onClick={() => setReporting((value) => !value)}>{m.live.reportMod}</button>
          {reporting ? (
            <div className="stack">
              <select value={reason} onChange={(event) => setReason(event.target.value as (typeof CHAT_REPORT_REASONS)[number])}>
                {CHAT_REPORT_REASONS.map((item) => (
                  <option key={item} value={item}>{m.report[item]}</option>
                ))}
              </select>
              <textarea value={reportNote} maxLength={500} placeholder={m.report.details} onChange={(event) => setReportNote(event.target.value)} />
              <button type="button" className="btn-primary" onClick={() => void sendReport()}>{m.report.send}</button>
            </div>
          ) : null}
          {canModerate ? (
            <button type="button" onClick={() => void removeForEveryone()}>{m.live.removeEveryone}</button>
          ) : null}
          <button type="button" onClick={() => setMenu(null)}>{m.gifts.close}</button>
        </div>
      ) : null}
    </>
  );
}
