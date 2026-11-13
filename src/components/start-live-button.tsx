"use client";

import { CONTENT_CATEGORIES } from "@/config/app";
import { liveStartNotice, mediaFailureKind, type LiveStartNotice } from "@/lib/live-start";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "./providers";

export function StartLiveButton({
  circleId,
  configured,
  label,
  initialTitle = "",
  initialCategory = "",
  ideaSlug = "",
}: {
  circleId?: string;
  configured: boolean;
  label?: string;
  initialTitle?: string;
  initialCategory?: string;
  ideaSlug?: string;
}) {
  const { messages: m } = useI18n();
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState(initialCategory);

  function noticeText(notice: LiveStartNotice) {
    if (notice === "age") return m.live.ageFirst;
    if (notice === "terms") return m.terms.need;
    if (notice === "creator") return m.live.needCreator;
    if (notice === "config") return m.live.notConfigured;
    if (notice === "circle") return m.live.circleOnly;
    if (notice === "parent") return m.guardian.locked;
    if (notice === "minorLive") return m.guardian.noLive;
    return m.live.startFailed;
  }

  async function prepareMedia() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return "skip" as const;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((track) => track.stop());
      return "ok" as const;
    } catch (error) {
      const name = error instanceof Error ? error.name : undefined;
      try {
        const audio = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audio.getTracks().forEach((track) => track.stop());
        return "ok" as const;
      } catch (audioError) {
        const audioName = audioError instanceof Error ? audioError.name : name;
        return mediaFailureKind(audioName);
      }
    }
  }

  async function start() {
    if (!configured) {
      setNote(m.live.notConfigured);
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const media = await prepareMedia();
      if (media === "denied") {
        setNote(m.live.allowMedia);
        return;
      }
      const response = await fetch("/api/live/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(circleId ? { circleId } : {}),
          ...(title.trim() ? { title: title.trim() } : {}),
          ...(category ? { contentCategory: category } : {}),
          ...(ideaSlug ? { ideaSlug } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      const notice = liveStartNotice(typeof data.error === "string" ? data.error : undefined, response.ok && Boolean(data.id));
      if (notice) {
        setNote(noticeText(notice));
        return;
      }
      router.push(`/live/${data.id}`);
    } catch {
      setNote(m.live.startFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      {circleId ? null : (
        <>
          <label className="field">
            <span>{m.upload.name}</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} />
          </label>
          <label className="field">
            <span>{m.upload.category}</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">{m.upload.categoryNone}</option>
              {CONTENT_CATEGORIES.map((item) => (
                <option key={item} value={item}>{m.contentCategories[item]}</option>
              ))}
            </select>
          </label>
        </>
      )}
      <button type="button" className="btn-primary" disabled={busy} onClick={start}>
        {label ?? (circleId ? m.live.circle : m.live.start)}
      </button>
      {note ? <p className="notice" role="alert">{note}</p> : null}
    </div>
  );
}
