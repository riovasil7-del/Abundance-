"use client";

import { useEffect, useState } from "react";
import { discardDeviceDraft, listDeviceDrafts } from "@/lib/draft-store";
import { releaseTracks, type LocalDraft } from "@/lib/low-data";
import { useI18n } from "./providers";

export function StudioDesk({
  ownerId,
  stories,
}: {
  ownerId: string;
  stories: { id: string; title: string; caption: string; visibility: string; captionsVtt: string | null }[];
}) {
  const { messages: m } = useI18n();
  const [drafts, setDrafts] = useState<LocalDraft[]>([]);
  const [mic, setMic] = useState<"off" | "on" | "blocked">("off");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void listDeviceDrafts(ownerId).then(setDrafts).catch(() => setDrafts([]));
  }, [ownerId]);

  useEffect(() => {
    return () => {
      if (stream) releaseTracks(stream.getTracks());
    };
  }, [stream]);

  async function startMic() {
    setNote(m.studio.micConsent);
    try {
      const next = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setStream(next);
      setMic("on");
    } catch {
      setMic("blocked");
    }
  }

  function stopMic() {
    if (stream) releaseTracks(stream.getTracks());
    setStream(null);
    setMic("off");
  }

  return (
    <div className="stack" data-screen="studio">
      <section className="stack">
        <h2>{m.studio.localDrafts}</h2>
        <p className="muted">{m.studio.localHint}</p>
        {drafts.length === 0 ? <p className="empty">{m.studio.none}</p> : null}
        {drafts.map((draft) => (
          <article key={draft.id} className="card">
            <strong>{draft.title || m.studio.untitled}</strong>
            <p>{draft.caption}</p>
            <a className="btn-ghost" href={`/upload?draft=${draft.id}`}>
              {m.studio.restore}
            </a>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                void discardDeviceDraft(ownerId, draft.id).then(() => setDrafts((current) => current.filter((row) => row.id !== draft.id)));
              }}
            >
              {m.studio.discard}
            </button>
          </article>
        ))}
      </section>

      <section className="stack" data-screen="mic-check">
        <h2>{m.studio.mic}</h2>
        <p className="muted">{m.studio.micConsent}</p>
        {mic === "on" ? <p className="notice">{m.studio.micOn}</p> : null}
        {mic === "blocked" ? <p className="notice">{m.studio.micBlocked}</p> : null}
        {mic === "on" ? (
          <button type="button" className="btn-ghost" onClick={stopMic}>
            {m.studio.micStop}
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => void startMic()}>
            {m.studio.mic}
          </button>
        )}
      </section>

      <section className="stack">
        <h2>{m.studio.captions}</h2>
        <p className="muted">{m.studio.captionsHint}</p>
        {stories.map((story) => (
          <form
            key={story.id}
            className="card stack"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void fetch(`/api/stories/${story.id}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ captionsVtt: String(data.get("captions") ?? "") }),
              }).then((response) => setNote(response.ok ? m.studio.saved : m.common.error));
            }}
          >
            <strong>{story.title}</strong>
            <p className="muted">{story.visibility}</p>
            <label className="field">
              <span>{m.studio.captions}</span>
              <textarea name="captions" defaultValue={story.captionsVtt ?? ""} maxLength={8000} />
            </label>
            <button className="btn-ghost" type="submit">
              {m.studio.saveCaptions}
            </button>
          </form>
        ))}
        {note ? <p className="notice">{note}</p> : null}
      </section>
    </div>
  );
}
