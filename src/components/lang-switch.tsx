"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/config/app";

export function LangSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();

  function choose(next: Locale) {
    document.cookie = `locale=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  }

  return (
    <div className="lang-switch" role="group" aria-label="Language">
      <button type="button" className={locale === "sk" ? "on" : ""} onClick={() => choose("sk")}>
        SK
      </button>
      <button type="button" className={locale === "en" ? "on" : ""} onClick={() => choose("en")}>
        EN
      </button>
    </div>
  );
}
