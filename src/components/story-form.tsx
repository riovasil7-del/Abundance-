"use client";

import { useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { DEED_KINDS } from "@/config/app";
import { useI18n } from "./providers";

type Region = { x: number; y: number; w: number; h: number };
type Mode = "TEXT" | "NO_FACES" | "COVERED";

export function StoryForm({ circles }: { circles: { id: string; title: string }[] }) {
  const { messages: m } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("TEXT");
  const [regions, setRegions] = useState<Region[]>([]);
  const [draftBox, setDraftBox] = useState<Region | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  function point(event: PointerEvent<HTMLDivElement>) {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    };
  }

  async function review(form: HTMLFormElement) {
    const data = new FormData(form);
    data.set("regions", JSON.stringify(regions));
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/stories/preview", { method: "POST", body: data });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error === "VIDEO_REDACTION_UNSUPPORTED" ? m.upload.noVideo : m.common.error);
        setPreviewUrl(null);
        return;
      }
      const blob = await response.blob();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } finally {
      setBusy(false);
    }
  }

  async function publish(form: HTMLFormElement, visibility: "DRAFT" | "PRIVATE" | "PUBLISHED") {
    setBusy(true);
    setError(null);
    try {
      if (mode === "TEXT") {
        const data = new FormData(form);
        const response = await fetch("/api/stories", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: data.get("title"),
            caption: data.get("caption"),
            deedKind: data.get("deedKind"),
            circleId: data.get("circleId"),
            visibility,
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(m.common.error);
          return;
        }
        router.push(`/creator/${body.slug}`);
        router.refresh();
        return;
      }
      if (visibility === "PUBLISHED" && !previewUrl) {
        setError(m.upload.reviewFirst);
        return;
      }
      const data = new FormData(form);
      data.set("peopleNote", mode === "COVERED" ? "COVERED" : "NO_FACES");
      data.set("regions", JSON.stringify(regions));
      data.set("reviewed", previewUrl ? "true" : "false");
      data.set("visibility", visibility);
      const response = await fetch("/api/stories", { method: "POST", body: data });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error === "VIDEO_REDACTION_UNSUPPORTED" ? m.upload.noVideo : body.error === "REVIEW_REQUIRED" ? m.upload.reviewFirst : m.common.error);
        return;
      }
      router.push(`/creator/${body.slug}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="stack"
      data-screen="story-form"
      onSubmit={(event) => {
        event.preventDefault();
        void publish(event.currentTarget, "PUBLISHED");
      }}
    >
      <p className="notice">{m.upload.reminder}</p>
      <p>{m.upload.children}</p>
      <p className="muted">{m.upload.noTrack}</p>
      <label className="field">
        <span>{m.upload.name}</span>
        <input name="title" required minLength={2} maxLength={120} />
      </label>
      <label className="field">
        <span>{m.upload.caption}</span>
        <textarea name="caption" required minLength={2} maxLength={800} />
      </label>
      <label className="field">
        <span>{m.upload.deed}</span>
        <select name="deedKind" defaultValue="good_deed">
          {DEED_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {m.deeds[kind]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{m.upload.circle}</span>
        <select name="circleId" defaultValue="">
          <option value="">{m.upload.circleNone}</option>
          {circles.map((circle) => (
            <option key={circle.id} value={circle.id}>
              {circle.title}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>{m.upload.how}</legend>
        <label className="check-row">
          <input type="radio" name="mode" checked={mode === "TEXT"} onChange={() => setMode("TEXT")} />
          <span>{m.upload.wordsOnly}</span>
        </label>
        <label className="check-row">
          <input type="radio" name="mode" checked={mode === "NO_FACES"} onChange={() => setMode("NO_FACES")} />
          <span>{m.upload.noFaces}</span>
        </label>
        <label className="check-row">
          <input type="radio" name="mode" checked={mode === "COVERED"} onChange={() => setMode("COVERED")} />
          <span>{m.upload.cover}</span>
        </label>
      </fieldset>
      {mode === "TEXT" ? <p className="muted">{m.upload.wordsHint}</p> : null}
      {mode !== "TEXT" ? (
        <>
          <label className="field">
            <span>{m.upload.photo}</span>
            <input name="file" type="file" accept="image/jpeg,image/png" required />
          </label>
          <p className="muted">{m.upload.limits}</p>
          <p className="notice">{m.upload.noVideo}</p>
          {mode === "COVERED" ? (
            <div
              ref={frame}
              className="cover-frame"
              data-screen="cover-frame"
              onPointerDown={(event) => {
                start.current = point(event);
                setDraftBox(null);
              }}
              onPointerMove={(event) => {
                if (!start.current) return;
                const next = point(event);
                setDraftBox({
                  x: Math.min(start.current.x, next.x),
                  y: Math.min(start.current.y, next.y),
                  w: Math.abs(next.x - start.current.x),
                  h: Math.abs(next.y - start.current.y),
                });
              }}
              onPointerUp={() => {
                if (draftBox && draftBox.w > 0.02 && draftBox.h > 0.02) setRegions((current) => [...current, draftBox].slice(0, 12));
                start.current = null;
                setDraftBox(null);
              }}
            >
              <span>{m.upload.draw}</span>
              {regions.map((region, index) => (
                <i key={`${region.x}-${region.y}-${index}`} style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.w * 100}%`, height: `${region.h * 100}%` }} />
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="btn-ghost"
            disabled={busy || (mode === "COVERED" && regions.length === 0)}
            onClick={(event) => void review(event.currentTarget.form!)}
          >
            {m.upload.review}
          </button>
          {previewUrl ? (
            <figure data-screen="redaction-preview">
              <img src={previewUrl} alt={m.upload.reviewed} />
              <figcaption>{m.upload.reviewed}</figcaption>
            </figure>
          ) : null}
        </>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
      <button className="btn-primary" type="submit" disabled={busy || (mode !== "TEXT" && !previewUrl) || (mode === "COVERED" && regions.length === 0)}>
        {m.upload.publish}
      </button>
      <button
        className="btn-ghost"
        type="button"
        disabled={busy}
        onClick={(event) => void publish(event.currentTarget.form!, "DRAFT")}
      >
        {m.upload.draft}
      </button>
    </form>
  );
}
