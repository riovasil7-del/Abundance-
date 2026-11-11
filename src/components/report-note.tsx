"use client";

import { useState } from "react";
import { useI18n } from "./providers";

export function ReportNoteButton({ id }: { id: string }) {
  const { messages: m } = useI18n();
  const [sent, setSent] = useState(false);

  async function report() {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: "ENCOURAGEMENT", targetId: id, reason: "other" }),
    });
    if (response.ok) setSent(true);
  }

  return (
    <button type="button" className="btn-ghost" disabled={sent} onClick={() => void report()}>
      {sent ? m.admin.review : m.bond.reportNote}
    </button>
  );
}
