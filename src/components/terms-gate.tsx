"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "./providers";

export function TermsGate({ needed }: { needed: boolean }) {
  const { messages: m } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!needed) return null;

  async function accept() {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch("/api/account/terms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acceptTerms: true }),
      });
      if (!response.ok) {
        setNote(m.common.error);
        return;
      }
      setNote(m.terms.saved);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="notice stack" data-screen="terms-gate">
      <p>{m.terms.need}</p>
      <button type="button" className="btn-primary" disabled={busy} onClick={() => void accept()}>
        {m.terms.accept}
      </button>
      {note ? <p>{note}</p> : null}
    </div>
  );
}
