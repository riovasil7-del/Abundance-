"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "./providers";

/** A checkbox-level declaration. It never marks the person as identity-verified. */
export function AgeAttest() {
  const router = useRouter();
  const { messages: m } = useI18n();
  return (
    <button
      type="button"
      className="btn-primary"
      onClick={() => {
        void fetch("/api/account/age", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ adult: true }),
        }).then(() => router.refresh());
      }}
    >
      {m.age.button}
    </button>
  );
}
