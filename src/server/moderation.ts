export type KindnessReview = {
  status: "VISIBLE" | "FLAGGED";
  note?: string;
};

/**
 * Kindness hook for comments. This is a local word list on purpose:
 * a hosted moderation model can implement the same function later
 * without changing the comment route.
 */
export interface KindnessModerator {
  review(text: string): KindnessReview;
}

const HUMILIATION_OR_PRESSURE = [
  "worthless",
  "kill yourself",
  "kys",
  "idiot",
  "stupid",
  "hate you",
  "loser",
  "send money now",
  "wire me",
  "hlupak",
  "hlupák",
  "idiotka",
  "idiote",
  "nenavidim",
  "nenávidím",
  "odporny",
  "odporný",
  "zobrac",
  "žobrák",
  "posli peniaze hned",
  "pošli peniaze hneď",
  "okamzite posli",
  "okamžite pošli",
];

function normalize(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

export const keywordModerator: KindnessModerator = {
  review(text: string): KindnessReview {
    const normalized = normalize(text);
    if (!normalized) return { status: "FLAGGED", note: "empty" };
    if (normalized.length > 500) return { status: "FLAGGED", note: "too_long" };
    const hit = HUMILIATION_OR_PRESSURE.find((phrase) => normalized.includes(phrase));
    if (hit) return { status: "FLAGGED", note: "kindness_filter" };
    return { status: "VISIBLE" };
  },
};

export function reviewComment(text: string, moderator: KindnessModerator = keywordModerator): KindnessReview {
  return moderator.review(text);
}
