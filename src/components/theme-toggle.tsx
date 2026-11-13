"use client";

import { useEffect, useState } from "react";
import { THEME_COOKIE, THEME_STORAGE_KEY, parseTheme, type ThemeChoice } from "@/lib/theme";
import { useI18n } from "./providers";

export function ThemeToggle({ initial, loggedIn }: { initial: ThemeChoice | null; loggedIn: boolean }) {
  const { messages: m } = useI18n();
  const [theme, setTheme] = useState<ThemeChoice | null>(initial);

  async function choose(next: ThemeChoice) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* private mode */
    }
    document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    if (!loggedIn) return;
    await fetch("/api/account/theme", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme: next }),
    }).catch(() => undefined);
  }

  useEffect(() => {
    if (theme) return;
    const fromDom = parseTheme(document.documentElement.dataset.theme);
    if (fromDom) setTheme(fromDom);
  }, [theme]);

  const current = theme;

  return (
    <section className="stack" data-screen="theme">
      <h2>{m.me.themeLabel}</h2>
      <div className="theme-toggle" role="group" aria-label={m.me.themeLabel}>
        <button type="button" className={current === "pearl" ? "on" : ""} aria-pressed={current === "pearl"} onClick={() => void choose("pearl")}>
          {m.me.themePearl}
        </button>
        <button type="button" className={current === "diamond" ? "on" : ""} aria-pressed={current === "diamond"} onClick={() => void choose("diamond")}>
          {m.me.themeDiamond}
        </button>
      </div>
    </section>
  );
}
