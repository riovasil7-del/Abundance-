"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isContentCategory } from "@/config/app";
import type { PublicLiveCard } from "@/lib/live-list";
import { useI18n } from "./providers";

/** Refreshes an open list. A page left on screen does not otherwise hear that someone went live. */
export function LiveNowList({ initial, category }: { initial: PublicLiveCard[]; category: string | null }) {
  const { messages: m } = useI18n();
  const [items, setItems] = useState(initial);

  useEffect(() => {
    setItems(initial);
  }, [initial, category]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const query = category ? `?category=${encodeURIComponent(category)}` : "";
      const response = await fetch(`/api/live/sessions${query}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (cancelled || !response.ok || !Array.isArray(data?.sessions)) return;
      setItems(data.sessions as PublicLiveCard[]);
    }
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [category]);

  if (items.length === 0) return <p className="empty">{m.live.empty}</p>;

  return (
    <>
      {items.map((session) => (
        <Link key={session.id} href={`/live/${session.id}`} className="card person" style={{ textDecoration: "none" }}>
          <img src={session.hostAvatar} alt="" />
          <div>
            <span className="pill">{m.live.title}</span>
            {isContentCategory(session.contentCategory) ? <span className="pill">{m.contentCategories[session.contentCategory]}</span> : null}
            <h2>{session.hostName}</h2>
            <p className="muted">{session.circle ? m.live.circle : session.title}</p>
          </div>
        </Link>
      ))}
    </>
  );
}
