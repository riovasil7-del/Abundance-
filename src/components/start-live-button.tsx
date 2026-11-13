"use client";

import { CONTENT_CATEGORIES } from "@/config/app";
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

  async function start() {
    if (!configured) {
      setNote(m.live.notConfigured);
      return;
    }
    setBusy(true);
    setNote(null);
    try {
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
      if (data.error === "TERMS_REQUIRED") {
        setNote(m.terms.need);
        return;
      }
      if (data.error === "AGE_REQUIRED") {
        setNote(m.age.need);
        return;
      }
      if (data.error === "PARENT_REQUIRED") {
        setNote(m.guardian.locked);
        return;
      }
      if (data.error === "MINOR_NO_LIVE") {
        setNote(m.guardian.noLive);
        return;
      }
      if (response.status === 503 || data.error === "LIVE_NOT_CONFIGURED") {
        setNote(m.live.notConfigured);
        return;
      }
      if (!response.ok || !data.id) {
        setNote(m.common.error);
        return;
      }
      router.push(`/live/${data.id}`);
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
      {note ? <p className="notice">{note}</p> : null}
    </div>
  );
}
