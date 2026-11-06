import type { Locale } from "../config/app";

export const LANGUAGE_META: Record<Locale, { nativeName: string; dir: "ltr" | "rtl"; intl: string }> = {
  sk: { nativeName: "Slovenčina", dir: "ltr", intl: "sk-SK" },
  en: { nativeName: "English", dir: "ltr", intl: "en-US" },
  cs: { nativeName: "Čeština", dir: "ltr", intl: "cs-CZ" },
  de: { nativeName: "Deutsch", dir: "ltr", intl: "de-DE" },
  fr: { nativeName: "Français", dir: "ltr", intl: "fr-FR" },
  es: { nativeName: "Español", dir: "ltr", intl: "es-ES" },
  pt: { nativeName: "Português", dir: "ltr", intl: "pt-PT" },
  it: { nativeName: "Italiano", dir: "ltr", intl: "it-IT" },
  pl: { nativeName: "Polski", dir: "ltr", intl: "pl-PL" },
  sw: { nativeName: "Kiswahili", dir: "ltr", intl: "sw-KE" },
  am: { nativeName: "አማርኛ", dir: "ltr", intl: "am-ET" },
  ha: { nativeName: "Hausa", dir: "ltr", intl: "ha-NG" },
  yo: { nativeName: "Yorùbá", dir: "ltr", intl: "yo-NG" },
  ig: { nativeName: "Igbo", dir: "ltr", intl: "ig-NG" },
  zu: { nativeName: "isiZulu", dir: "ltr", intl: "zu-ZA" },
  ar: { nativeName: "العربية", dir: "rtl", intl: "ar" },
};
