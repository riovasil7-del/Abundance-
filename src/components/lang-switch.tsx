"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LOCALES, type Locale } from "@/config/app";
import { LANGUAGE_META } from "@/i18n/meta";
import { useI18n } from "./providers";

export function LangSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);

  async function choose(next: Locale) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: next, chosen: true }),
    });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" className="lang-current" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={messages.language.choose}>
        {LANGUAGE_META[locale].nativeName}
      </button>
      {open ? (
        <div className="sheet-back" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-label={messages.language.choose} onClick={(event) => event.stopPropagation()}>
            <p className="kicker">{messages.language.label}</p>
            <h2>{messages.language.choose}</h2>
            <div className="lang-list">
              {LOCALES.map((code) => (
                <button type="button" key={code} className={code === locale ? "lang-option on" : "lang-option"} onClick={() => void choose(code)}>
                  {LANGUAGE_META[code].nativeName}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
