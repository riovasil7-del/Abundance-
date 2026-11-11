"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { contentCategoryForIdea, type IdeaCategory } from "@/config/app";
import { filterIdeas } from "@/lib/idea-rules";
import { useI18n } from "./providers";

export type IdeaCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: IdeaCategory;
  estimatedMinutes: number;
  isFree: boolean;
  status: string;
  saved: boolean;
};

export function IdeasLibrary({
  ideas,
  categories,
  loggedIn,
}: {
  ideas: IdeaCard[];
  categories: IdeaCategory[];
  loggedIn: boolean;
}) {
  const { messages: m } = useI18n();
  const [category, setCategory] = useState<string>("");
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>(Object.fromEntries(ideas.map((idea) => [idea.id, idea.saved])));
  const [note, setNote] = useState<string | null>(null);
  const visible = useMemo(() => {
    const pool = savedOnly ? ideas.filter((idea) => saved[idea.id]) : ideas.filter((idea) => idea.status === "approved" || idea.status === "pending");
    return filterIdeas(pool, { category, query });
  }, [ideas, category, query, savedOnly, saved]);

  async function toggle(id: string) {
    if (!loggedIn) {
      setNote(m.ideas.loginSave);
      return;
    }
    const response = await fetch(`/api/ideas/${id}/save`, { method: "POST" });
    if (!response.ok) {
      setNote(m.common.error);
      return;
    }
    const body = await response.json();
    setSaved((current) => ({ ...current, [id]: Boolean(body.saved) }));
  }

  async function propose(form: HTMLFormElement) {
    const data = new FormData(form);
    const response = await fetch("/api/ideas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        description: data.get("description"),
        category: data.get("category"),
        minutes: Number(data.get("minutes")),
        isFree: data.get("isFree") === "on",
      }),
    });
    setNote(response.ok ? m.ideas.proposeSent : m.common.error);
    if (response.ok) form.reset();
  }

  return (
    <div className="stack">
      <label className="field">
        <span>{m.ideas.search}</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="chip-row" role="group" aria-label={m.ideas.all}>
        <button type="button" className={category === "" && !savedOnly ? "chip on" : "chip"} onClick={() => { setCategory(""); setSavedOnly(false); }}>
          {m.ideas.all}
        </button>
        <button type="button" className={savedOnly ? "chip on" : "chip"} onClick={() => setSavedOnly((value) => !value)}>
          {m.ideas.saved}
        </button>
        {categories.map((item) => (
          <button type="button" key={item} className={category === item ? "chip on" : "chip"} onClick={() => { setCategory(item); setSavedOnly(false); }}>
            {m.ideaCategories[item]}
          </button>
        ))}
      </div>
      {visible.length === 0 ? <p className="empty">{m.ideas.empty}</p> : null}
      {visible.map((idea) => {
        const content = contentCategoryForIdea(idea.category);
        const href = `idea=${encodeURIComponent(idea.slug)}&category=${content}&title=${encodeURIComponent(idea.title)}`;
        return (
          <article key={idea.id} className="card stack" data-screen="idea-card">
            <div className="row">
              <span className="pill">{m.ideaCategories[idea.category]}</span>
              <span className="pill soft">{idea.estimatedMinutes} {m.ideas.minutes}</span>
              <span className="pill soft">{idea.isFree ? m.ideas.free : m.ideas.paid}</span>
            </div>
            <h2>{idea.title}</h2>
            <p>{idea.description}</p>
            {idea.status !== "approved" ? <p className="notice">{m.ideas.pending}</p> : null}
            <p className="muted">{m.ideas.dignity}</p>
            <div className="stack">
              <Link className="btn-primary" href={`/upload?${href}`}>{m.ideas.film}</Link>
              <Link className="btn-ghost" href={`/live?${href}`}>{m.ideas.live}</Link>
              {idea.status === "approved" ? (
                <button type="button" className="btn-ghost" onClick={() => void toggle(idea.id)}>
                  {saved[idea.id] ? m.ideas.savedDone : m.ideas.save}
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
      {note ? <p className="notice">{note}</p> : null}
      {loggedIn ? (
        <form
          className="card stack"
          onSubmit={(event) => {
            event.preventDefault();
            void propose(event.currentTarget);
          }}
        >
          <h2>{m.ideas.propose}</h2>
          <label className="field">
            <span>{m.ideas.proposeTitle}</span>
            <input name="title" required minLength={3} maxLength={120} />
          </label>
          <label className="field">
            <span>{m.ideas.proposeBody}</span>
            <textarea name="description" required minLength={8} maxLength={600} />
          </label>
          <label className="field">
            <span>{m.ideaCategories.neighbours}</span>
            <select name="category" defaultValue="neighbours">
              {categories.map((item) => (
                <option key={item} value={item}>{m.ideaCategories[item]}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{m.ideas.proposeMinutes}</span>
            <input name="minutes" type="number" min={1} max={180} defaultValue={15} required />
          </label>
          <label className="check-row">
            <input name="isFree" type="checkbox" defaultChecked />
            <span>{m.ideas.proposeFree}</span>
          </label>
          <button type="submit" className="btn-primary">{m.ideas.proposeSend}</button>
        </form>
      ) : null}
    </div>
  );
}
