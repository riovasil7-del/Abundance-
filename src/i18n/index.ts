import { isLocale, type Locale } from "../config/app";
import cs from "./dictionaries/cs";
import de from "./dictionaries/de";
import fr from "./dictionaries/fr";
import es from "./dictionaries/es";
import pt from "./dictionaries/pt";
import it from "./dictionaries/it";
import pl from "./dictionaries/pl";
import sw from "./dictionaries/sw";
import am from "./dictionaries/am";
import ha from "./dictionaries/ha";
import yo from "./dictionaries/yo";
import ig from "./dictionaries/ig";
import zu from "./dictionaries/zu";
import ar from "./dictionaries/ar";
import { en } from "./en";
import { LANGUAGE_META } from "./meta";
import { sk, type Messages } from "./sk";

export { LANGUAGE_META };

/**
 * To add a language: create src/i18n/dictionaries/<code>.ts (a Messages object),
 * add the code to LOCALES in src/config/app.ts, and one line in DICTIONARIES.
 */
export const DICTIONARIES: Record<Locale, Messages> = {
  sk,
  en,
  cs,
  de,
  fr,
  es,
  pt,
  it,
  pl,
  sw,
  am,
  ha,
  yo,
  ig,
  zu,
  ar,
};

/**
 * Languages written with care. Amharic, Hausa, Yoruba, Igbo, and Zulu
 * should be read by a native speaker before they are treated as final.
 * Kiswahili is close, and a native pass would still help.
 * Terms, idea, and category wording outside Slovak and English also needs that native pass.
 */
export const REVIEW_BEFORE_FINAL: readonly Locale[] = ["sw", "am", "ha", "yo", "ig", "zu"];

export function messagesFor(locale: Locale): Messages {
  return DICTIONARIES[locale] ?? DICTIONARIES.en;
}

export function negotiateLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : "en";
}

export type { Messages, Locale };
