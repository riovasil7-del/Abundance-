"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "./providers";
import { Sheet } from "./sheet";

export type SignInReason = "support" | "write" | "follow" | "post";

export function SignInSheet({ reason, onClose }: { reason: SignInReason; onClose: () => void }) {
  const { messages: m } = useI18n();
  const copy =
    reason === "support"
      ? m.auth.supportPrompt
      : reason === "write"
        ? m.auth.signInWrite
        : reason === "follow"
          ? m.auth.signInFollow
          : m.auth.signInPost;
  return (
    <Sheet title={m.auth.register} onClose={onClose}>
      <p className="lede">{copy}</p>
      <Link className="btn-primary" href="/register">
        {m.auth.submitRegister}
      </Link>
      <Link className="btn-ghost" href="/login">
        {m.auth.login}
      </Link>
    </Sheet>
  );
}

/** Opens the support sheet. Watching the page underneath stays put until the person chooses. */
export function SupportSignInButton({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? <SignInSheet reason="support" onClose={() => setOpen(false)} /> : null}
    </>
  );
}
