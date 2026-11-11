import { GIFT_CONFIRM_CENTS } from "../config/app";
import { videoPreload as preloadChoice } from "./low-data";

/** Live and feed comments keep only the newest lines. */
export const COMMENT_MEMORY = 40;

/** Documented in src/config/app.ts. The sheet repeats the same dollar line. */
export function needsGiftConfirm(priceCents: number, threshold = GIFT_CONFIRM_CENTS): boolean {
  return Number.isInteger(priceCents) && priceCents >= threshold;
}

/** A retry of the same send keeps the token. Cancel or success clears it. */
export function rememberGiftToken(current: string | null, mint: () => string): string {
  if (current) return current;
  return mint();
}

export function capTail<T>(items: readonly T[], max = COMMENT_MEMORY): T[] {
  if (max < 1) return [];
  if (items.length <= max) return [...items];
  return items.slice(items.length - max);
}

/** Only the active video and its neighbor may fetch metadata. Low data skips the neighbor. */
export function videoPreload(index: number, active: number, lowData = false): "metadata" | "none" {
  return preloadChoice(index, active, lowData);
}
