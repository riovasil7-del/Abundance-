"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/config/app";
import type { Messages } from "@/i18n/sk";

const I18nContext = createContext<{ locale: Locale; messages: Messages } | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, messages }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("I18nProvider missing");
  return value;
}
