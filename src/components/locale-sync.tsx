"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Locale } from "@/config/app";
import { matchLanguageList } from "@/i18n/negotiate";

/** If the person has not chosen a language, follow navigator.languages when it differs from the page. */
export function LocaleSync({ locale, followDevice }: { locale: Locale; followDevice: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!followDevice) return;
    const best = matchLanguageList(navigator.languages?.length ? navigator.languages : [navigator.language]);
    if (best === locale) return;
    document.cookie = `localeAuto=${best};path=/;samesite=lax`;
    router.refresh();
  }, [followDevice, locale, router]);
  return null;
}
