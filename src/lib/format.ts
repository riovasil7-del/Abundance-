import type { Locale } from "../config/app";

export function formatMoney(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "sk" ? "sk-SK" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatWhen(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "sk" ? "sk-SK" : "en-US", {
    dateStyle: "medium",
  }).format(date);
}

export function pickLocalized(
  locale: Locale,
  primary: string,
  english: string | null | undefined,
): string {
  if (locale === "en" && english) return english;
  return primary;
}
