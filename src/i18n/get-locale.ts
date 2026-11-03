import { cookies } from "next/headers";
import { negotiateLocale, type Locale } from "./index";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return negotiateLocale(jar.get("locale")?.value);
}
