import { isLocale, type Locale } from "../config/app";
import { en } from "./en";
import { sk, type Messages } from "./sk";

const dictionaries: Record<Locale, Messages> = { sk, en };

export function messagesFor(locale: Locale): Messages {
  return dictionaries[locale];
}

export function negotiateLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : "sk";
}

export type { Messages, Locale };
