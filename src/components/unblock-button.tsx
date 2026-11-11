"use client";

import { useRouter } from "next/navigation";

export function UnblockButton({ userId, label }: { userId: string; label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={() => {
        void fetch("/api/blocks", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId }),
        }).then(() => router.refresh());
      }}
    >
      {label}
    </button>
  );
}
