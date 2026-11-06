import { cookies, headers } from "next/headers";
import { isLocale, type Locale } from "../config/app";
import { getCurrentUser } from "../server/auth";
import { negotiateAcceptLanguage } from "./negotiate";

export async function getLocale(
  knownUser?: { locale: string; localeChosen: boolean } | null,
): Promise<Locale> {
  const jar = await cookies();
  // A locale cookie is a manual choice (including the older SK/EN switcher).
  const picked = jar.get("locale")?.value;
  if (isLocale(picked)) return picked;

  const user = knownUser === undefined ? await getCurrentUser() : knownUser;
  if (user?.localeChosen && isLocale(user.locale)) return user.locale;

  const auto = jar.get("localeAuto")?.value;
  if (isLocale(auto)) return auto;

  const headerList = await headers();
  return negotiateAcceptLanguage(headerList.get("accept-language"));
}

/** True when nothing has been chosen, so the browser language may update the page. */
export async function followsDeviceLanguage(
  knownUser?: { localeChosen: boolean } | null,
): Promise<boolean> {
  const jar = await cookies();
  if (jar.get("localeChosen")?.value === "1") return false;
  if (isLocale(jar.get("locale")?.value)) return false;
  const user = knownUser === undefined ? await getCurrentUser() : knownUser;
  return !user?.localeChosen;
}
