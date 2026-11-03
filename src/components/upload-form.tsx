"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEED_KINDS } from "@/config/app";
import { useI18n } from "./providers";

export function UploadForm({ circles }: { circles: { id: string; title: string }[] }) {
  const { messages: m } = useI18n();
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(formData: FormData) {
    if (!consent) {
      setError(m.upload.consent);
      return;
    }
    formData.set("consent", "true");
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/videos", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(m.common.error);
        return;
      }
      router.push(`/creator/${data.slug}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(new FormData(event.currentTarget));
      }}
    >
      <label className="field">
        <span>{m.upload.name}</span>
        <input name="title" required minLength={2} />
      </label>
      <label className="field">
        <span>{m.upload.caption}</span>
        <textarea name="caption" required minLength={2} />
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
      <label className="field">
        <span>{m.upload.video}</span>
        <input name="file" type="file" accept="video/mp4,video/webm,video/quicktime" required />
      </label>
      <label className="check-row">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>{m.upload.consent}</span>
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <button className="btn-primary" type="submit" disabled={busy || !consent}>
        {m.upload.submit}
      </button>
    </form>
  );
}
