/**
 * Product identity and business rules.
 *
 * Rename the product by changing APP_NAME only.
 * Chrome, the PWA manifest, and page titles read it from here.
 *
 * PLATFORM_FEE is the business rule for every donor transaction:
 * 15% stays with the platform, 85% is credited to creators.
 * Money math must not multiply by the float — see src/server/fees.ts.
 */

export const APP_NAME = "Hojnosť";

/** Working subtitle kept next to the name so a future rename stays obvious. */
export const APP_NAME_NOTE = "working name";

/** Exactly 15%. Do not compute cents with this float. */
export const PLATFORM_FEE = 0.15;

/** Integer fraction equal to PLATFORM_FEE. 15 / 100 = 0.15 */
export const PLATFORM_FEE_NUMERATOR = 15;
export const PLATFORM_FEE_DENOMINATOR = 100;

export const LEDGER_CURRENCY = "usd";

/** Default payout hold. A creator profile may override it. */
export const PAYOUT_HOLD_DAYS = 7;

export const CONTENT_RULES_VERSION = 1;

export const CONTENT_RULES = [
  { id: "good_spirit" },
  { id: "no_humiliation" },
  { id: "no_begging" },
  { id: "consent" },
  { id: "children" },
] as const;

export type ContentRuleId = (typeof CONTENT_RULES)[number]["id"];

/** Monthly family support, in cents. Server accepts only these amounts. */
export const FAMILY_TIERS_CENTS = [500, 1000, 2500] as const;

export type FamilyTierCents = (typeof FAMILY_TIERS_CENTS)[number];

/**
 * Svetielka / lights. One light is one cent of gift value.
 * A pack's dollar price is the number of lights, said in the open.
 * The 15/85 split happens when a light is given, not when a pack is bought.
 */
export const LIGHT_PACKS = [
  { slug: "small", priceCents: 500, lights: 500 },
  { slug: "medium", priceCents: 1000, lights: 1000 },
  { slug: "large", priceCents: 2500, lights: 2500 },
  { slug: "blessing", priceCents: 5000, lights: 5000 },
] as const;

export type LightPackSlug = (typeof LIGHT_PACKS)[number]["slug"];

export function lightPack(slug: string | undefined | null) {
  return LIGHT_PACKS.find((pack) => pack.slug === slug) ?? null;
}

/**
 * Gifts at or above this catalog price ask for a second yes.
 * The number is visible in the gift sheet. A smaller gift sends on the first yes.
 * One light is one cent, so 500 is $5.00.
 */
export const GIFT_CONFIRM_CENTS = 500;

/** Bump this when the terms text changes. Sign-up and creator publish check it. */
export const TERMS_VERSION = 1;

export const CONTENT_CATEGORIES = [
  "everyday",
  "mood",
  "dance",
  "music",
  "praise",
  "talk",
  "deed",
  "family",
  "nature",
] as const;
export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

export function isContentCategory(value: string | null | undefined): value is ContentCategory {
  return !!value && (CONTENT_CATEGORIES as readonly string[]).includes(value);
}

export const IDEA_CATEGORIES = [
  "neighbours",
  "children",
  "nature",
  "animals",
  "sick",
  "quick",
  "family",
  "mood",
] as const;
export type IdeaCategory = (typeof IDEA_CATEGORIES)[number];

export function isIdeaCategory(value: string | null | undefined): value is IdeaCategory {
  return !!value && (IDEA_CATEGORIES as readonly string[]).includes(value);
}

/** A suggested content chip for an idea. The creator can clear it. A deed is never required. */
export function contentCategoryForIdea(category: string): ContentCategory {
  if (category === "nature") return "nature";
  if (category === "family") return "family";
  if (category === "mood") return "mood";
  return "deed";
}

/**
 * Extra camera publishers besides the host.
 * Three is the initial cap: each extra video track is heavy on a phone connection.
 * Blessing-circle participants already publish through the circle and are not extra co-hosts.
 */
export const LIVE_MAX_COHOSTS = 3;

export const GIFT_CATALOG = [
  { slug: "heart", nameSk: "Srdiečko", nameEn: "Little heart", priceCents: 1, symbol: "❤️", sortOrder: 1, destination: "creator" },
  { slug: "smile", nameSk: "Úsmev", nameEn: "Smile", priceCents: 5, symbol: "😊", sortOrder: 2, destination: "creator" },
  { slug: "flower", nameSk: "Kvietok", nameEn: "Flower", priceCents: 10, symbol: "🌸", sortOrder: 3, destination: "creator" },
  { slug: "candle", nameSk: "Sviečka", nameEn: "Candle", priceCents: 20, symbol: "🕯️", sortOrder: 4, destination: "creator" },
  { slug: "cloud", nameSk: "Oblačik", nameEn: "Little cloud", priceCents: 50, symbol: "☁️", sortOrder: 5, destination: "creator" },
  { slug: "feather", nameSk: "Anjelské pierko", nameEn: "Angel feather", priceCents: 99, symbol: "🪶", sortOrder: 6, destination: "creator" },
  { slug: "wing", nameSk: "Anjelské krídielko", nameEn: "Angel wing", priceCents: 199, symbol: "🪽", sortOrder: 7, destination: "creator" },
  { slug: "dove", nameSk: "Holubica pokoja", nameEn: "Dove of peace", priceCents: 299, symbol: "🕊️", sortOrder: 8, destination: "creator" },
  { slug: "olive", nameSk: "Olivová ratolesť", nameEn: "Olive branch", priceCents: 499, symbol: "🌿", sortOrder: 9, destination: "creator" },
  { slug: "rainbow", nameSk: "Dúha nádeje", nameEn: "Rainbow of hope", priceCents: 999, symbol: "🌈", sortOrder: 10, destination: "creator" },
  { slug: "harp", nameSk: "Harfa", nameEn: "Harp", priceCents: 1999, symbol: "🎵", sortOrder: 11, destination: "creator" },
  { slug: "star", nameSk: "Betlehemská hviezda", nameEn: "Star of Bethlehem", priceCents: 2999, symbol: "⭐", sortOrder: 12, destination: "creator" },
  { slug: "lamp", nameSk: "Lampa svetla", nameEn: "Lamp of light", priceCents: 4999, symbol: "🏮", sortOrder: 13, destination: "creator" },
  { slug: "grail", nameSk: "Svätý grál", nameEn: "Holy grail", priceCents: 9999, symbol: "🏆", sortOrder: 14, destination: "creator" },
  { slug: "choir", nameSk: "Nebeský zbor", nameEn: "Heavenly choir", priceCents: 19999, symbol: "👼", sortOrder: 15, destination: "creator" },
  { slug: "gate", nameSk: "Nebeská brána", nameEn: "Heaven's gate", priceCents: 49999, symbol: "🌅", sortOrder: 16, destination: "creator" },
  { slug: "loaf", nameSk: "Bochník chleba", nameEn: "Loaf of bread", priceCents: 100, symbol: "🍞", sortOrder: 17, destination: "food" },
  { slug: "well", nameSk: "Studnička", nameEn: "A small well", priceCents: 500, symbol: "💧", sortOrder: 18, destination: "water" },
] as const;

export const DEED_KINDS = ["good_deed", "craft", "song", "gratitude"] as const;
export type DeedKind = (typeof DEED_KINDS)[number];

export const CRAFT_KEYS = ["weaving", "garden", "song", "kitchen"] as const;
export type CraftKey = (typeof CRAFT_KEYS)[number];

export const REPORT_REASONS = ["begging", "humiliation", "consent", "spam", "harassment", "inappropriate", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const LOCALES = [
  "sk",
  "en",
  "cs",
  "de",
  "fr",
  "es",
  "pt",
  "it",
  "pl",
  "sw",
  "am",
  "ha",
  "yo",
  "ig",
  "zu",
  "ar",
] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function payoutHoldDays(): number {
  const raw = process.env.PAYOUT_HOLD_DAYS;
  const parsed = raw ? Number.parseInt(raw, 10) : PAYOUT_HOLD_DAYS;
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 90) return PAYOUT_HOLD_DAYS;
  return parsed;
}
