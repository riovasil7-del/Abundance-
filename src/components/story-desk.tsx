"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "./providers";

export function StoryDesk({
  stories,
}: {
  stories: { id: string; title: string; visibility: string; mediaKind: string }[];
}) {
  const { messages: m } = useI18n();
  const router = useRouter();
  if (stories.length === 0) return null;
  const label = (visibility: string) =>
    visibility === "PUBLISHED" ? m.upload.published : visibility === "PRIVATE" ? m.upload.privateStory : m.upload.draft;

  async function send(id: string, method: "PATCH" | "DELETE", visibility?: string) {
    await fetch(`/api/stories/${id}`, {
      method,
      headers: method === "PATCH" ? { "content-type": "application/json" } : undefined,
      body: method === "PATCH" ? JSON.stringify({ visibility }) : undefined,
    });
    router.refresh();
  }

  return (
    <section className="stack" data-screen="story-desk">
      <h2>{m.upload.yours}</h2>
      {stories.map((story) => (
        <article key={story.id} className="card">
          <strong>{story.title}</strong>
          <p className="muted">
            {label(story.visibility)} · {story.mediaKind === "NONE" ? m.upload.wordsOnly : story.mediaKind}
          </p>
          <button type="button" className="btn-ghost" onClick={() => void send(story.id, "PATCH", "PUBLISHED")}>
            {m.upload.publish}
          </button>
          <button type="button" className="btn-ghost" onClick={() => void send(story.id, "PATCH", "PRIVATE")}>
            {m.upload.privateStory}
          </button>
          <button type="button" className="btn-ghost" onClick={() => void send(story.id, "DELETE")}>
            {m.upload.delete}
          </button>
        </article>
      ))}
    </section>
  );
}
