import { isLocale, type Locale } from "../config/app";

/** Map a BCP 47 tag (sk-SK, pt-BR, sw) onto a dictionary we actually have. */
export function matchLanguageTag(tag: string | undefined | null): Locale | null {
  if (!tag) return null;
  const base = tag.trim().toLowerCase().split("-")[0];
  return isLocale(base) ? base : null;
}

/** First supported language in a list, otherwise English. */
export function matchLanguageList(list: readonly string[] | undefined | null): Locale {
  for (const tag of list ?? []) {
    const match = matchLanguageTag(tag);
    if (match) return match;
  }
  return "en";
}

/** Browser Accept-Language, honouring q weights. Unsupported tags fall through to English. */
export function negotiateAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return "en";
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((item) => item.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { tag, q: Number.isFinite(q) ? q : 0 };
    })
    .sort((a, b) => b.q - a.q);
  for (const item of ranked) {
    const match = matchLanguageTag(item.tag);
    if (match) return match;
  }
  return "en";
}
