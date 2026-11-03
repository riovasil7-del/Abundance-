"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "./providers";

export function AdminActions({
  kind,
  id,
}: {
  kind: "creator" | "comment" | "video" | "report";
  id: string;
}) {
  const router = useRouter();
  const { messages: m } = useI18n();

  async function post(url: string, body: unknown) {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  if (kind === "creator") {
    return (
      <div className="admin-actions">
        <button type="button" className="btn-gold" onClick={() => post(`/api/admin/creators/${id}/verification`, { status: "VERIFIED" })}>
          {m.admin.verify}
        </button>
        <button type="button" className="btn-ghost" onClick={() => post(`/api/admin/creators/${id}/verification`, { status: "REJECTED" })}>
          {m.admin.reject}
        </button>
      </div>
    );
  }
  if (kind === "comment") {
    return (
      <div className="admin-actions">
        <button type="button" className="btn-gold" onClick={() => post(`/api/admin/comments/${id}`, { status: "VISIBLE" })}>
          {m.admin.show}
        </button>
        <button type="button" className="btn-ghost" onClick={() => post(`/api/admin/comments/${id}`, { status: "HIDDEN" })}>
          {m.admin.hide}
        </button>
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className="admin-actions">
        <button type="button" className="btn-ghost" onClick={() => post(`/api/admin/videos/${id}`, { status: "HIDDEN" })}>
          {m.admin.hide}
        </button>
        <button type="button" className="btn-gold" onClick={() => post(`/api/admin/videos/${id}`, { status: "VISIBLE" })}>
          {m.admin.show}
        </button>
      </div>
    );
  }
  return (
    <div className="admin-actions">
      <button type="button" className="btn-gold" onClick={() => post(`/api/admin/reports/${id}`, { status: "REVIEWED" })}>
        {m.admin.review}
      </button>
      <button type="button" className="btn-ghost" onClick={() => post(`/api/admin/reports/${id}`, { status: "DISMISSED" })}>
        {m.admin.dismiss}
      </button>
    </div>
  );
}

export function JoinCircleButton({ circleId }: { circleId: string }) {
  const { messages: m } = useI18n();
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-primary"
      onClick={async () => {
        await fetch(`/api/circles/${circleId}/join`, { method: "POST" });
        router.refresh();
      }}
    >
      {m.circles.join}
    </button>
  );
}

export function CreateCircleForm() {
  const { messages: m } = useI18n();
  const router = useRouter();
  const [error, setError] = useStateSafe();

  return (
    <form
      className="stack"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/circles", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: form.get("title"), description: form.get("description") }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(m.common.error);
          return;
        }
        router.push(`/circles/${data.id}`);
        router.refresh();
      }}
    >
      <label className="field">
        <span>{m.circles.newTitle}</span>
        <input name="title" required minLength={3} />
      </label>
      <label className="field">
        <span>{m.circles.newDescription}</span>
        <textarea name="description" required minLength={3} />
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <button className="btn-primary" type="submit">
        {m.circles.create}
      </button>
    </form>
  );
}

function useStateSafe() {
  const [error, setError] = useState<string | null>(null);
  return [error, setError] as const;
}
