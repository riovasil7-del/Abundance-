"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "./providers";

export function StartLiveButton({
  circleId,
  configured,
  label,
}: {
  circleId?: string;
  configured: boolean;
  label?: string;
}) {
  const { messages: m } = useI18n();
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        body: JSON.stringify(circleId ? { circleId } : {}),
      });
      const data = await response.json().catch(() => ({}));
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
      <button type="button" className="btn-primary" disabled={busy} onClick={start}>
        {label ?? (circleId ? m.live.circle : m.live.start)}
      </button>
      {note ? <p className="notice">{note}</p> : null}
    </div>
  );
}
