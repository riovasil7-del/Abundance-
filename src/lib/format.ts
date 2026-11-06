import type { Locale } from "../config/app";
import { LANGUAGE_META } from "../i18n/meta";

export function formatMoney(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(LANGUAGE_META[locale].intl, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatWhen(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LANGUAGE_META[locale].intl, {
    dateStyle: "medium",
  }).format(date);
}

export function pickLocalized(
  locale: Locale,
  primary: string,
  english: string | null | undefined,
): string {
  if (locale !== "sk" && english) return english;
  return primary;
}
